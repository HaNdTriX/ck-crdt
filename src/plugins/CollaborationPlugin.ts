import { Plugin } from 'ckeditor5'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export class CollaborationPlugin extends Plugin {
  provider?: WebsocketProvider

  static get pluginName() {
    return 'Collaboration'
  }

  init() {
    const editor = this.editor
    const ydoc = new Y.Doc()

    // Connect to WebSocket server
    this.provider = new WebsocketProvider('ws://localhost:1234', 'ckeditor-room-3', ydoc, {
      connect: true,
    })

    const ytext = ydoc.getText('editor')

    // Set up awareness (cursor positions, user info)
    const awareness = this.provider.awareness
    awareness.setLocalState({
      user: {
        name: 'User ' + Math.floor(Math.random() * 100),
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      },
      mouse: null,
    })

    // Wait for editor to be ready
    editor.ui.once('ready', () => {
      // Create container for remote cursors
      const cursorContainer = document.createElement('div')
      cursorContainer.className = 'remote-cursors-container'
      const parentElement = editor.ui.getEditableElement()?.parentElement
      if (parentElement) {
        parentElement.appendChild(cursorContainer)
      }

      // Track mouse position
      const editorElement = editor.ui.getEditableElement()
      if (editorElement) {
        // We might want to throttle these invokations
        editorElement.addEventListener('mousemove', (event: MouseEvent) => {
          const rect = editorElement.getBoundingClientRect()
          const x = event.clientX - rect.left
          const y = event.clientY - rect.top + 40

          awareness.setLocalStateField('mouse', { x, y })
        })

        editorElement.addEventListener('mouseleave', () => {
          awareness.setLocalStateField('mouse', null)
        })
      }

      // Handle remote cursors
      awareness.on('change', () => {
        const states = awareness.getStates()

        // Clear existing cursors
        const existingCursors = cursorContainer.querySelectorAll('.remote-mouse-cursor')
        existingCursors.forEach((cursor) => cursor.remove())

        // Add remote cursors
        states.forEach((state, clientId) => {
          if (clientId !== awareness.clientID && state.mouse) {
            const cursor = document.createElement('div')
            cursor.className = 'remote-mouse-cursor'
            cursor.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path fill="${state.user.color}" d="M0,0 L16,5.5 L9,9 L5.5,16 L0,0"/>
              </svg>
              <div class="remote-mouse-label" style="background-color: ${state.user.color}">
                ${state.user.name}
              </div>
            `
            cursor.style.transform = `translate(${state.mouse.x}px, ${state.mouse.y}px)`
            cursorContainer.appendChild(cursor)
          }
        })
      })
    })

    // Improved sync logic
    let isUpdating = false

    editor.model.document.on('change:data', () => {
      if (!isUpdating) {
        isUpdating = true
        const editorData = editor.getData()
        ytext.delete(0, ytext.length)
        ytext.insert(0, editorData)
        isUpdating = false
      }
    })

    ytext.observe(() => {
      if (!isUpdating) {
        isUpdating = true
        const content = ytext.toString()
        editor.setData(content)
        isUpdating = false
      }
    })

    // Handle initial content
    this.provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        const initialContent = ytext.toString()
        if (initialContent) {
          editor.setData(initialContent)
        }
      }
    })
  }

  destroy() {
    super.destroy()

    // Clean up
    const editorElement = this.editor.ui.element
    if (editorElement) {
      const cursorContainer = editorElement.querySelector('.remote-cursors-container')
      if (cursorContainer) {
        cursorContainer.remove()
      }
    }

    this.provider?.destroy()
  }
}
