import { Plugin } from 'ckeditor5'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

export default class CollaborationPlugin extends Plugin {
  providers?: (WebsocketProvider | IndexeddbPersistence)[]

  static get pluginName() {
    return 'Collaboration'
  }

  init() {
    const editor = this.editor
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText('editor')

    // Set up both providers to sync the same document
    this.providers = [
      new IndexeddbPersistence('ckeditor-room-3', ydoc),
      new WebsocketProvider('ws://localhost:1234', 'ckeditor-room-3', ydoc, {
        connect: true,
        maxBackoffTime: 5000,
      }),
    ]

    // Handle connection status from WebSocket provider
    const wsProvider = this.providers[1] as WebsocketProvider
    wsProvider.on('status', ({ status }: { status: 'connected' | 'disconnected' }) => {
      const editorElement = this.editor.ui.getEditableElement()
      if (editorElement) {
        editorElement.classList.toggle('offline-mode', status === 'disconnected')
      }
    })

    // Add connection status handling
    this.providers.forEach((provider) => {
      if (provider instanceof WebsocketProvider) {
        provider.on('status', ({ status }: { status: 'connected' | 'disconnected' }) => {
          const editorElement = this.editor.ui.getEditableElement()
          if (editorElement) {
            editorElement.classList.toggle('offline-mode', status === 'disconnected')
          }
        })
      }
    })

    // Set up awareness (cursor positions, user info)
    const awareness = this.providers[1] as WebsocketProvider
    awareness.awareness.setLocalState({
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

          awareness.awareness.setLocalStateField('mouse', { x, y })
        })

        editorElement.addEventListener('mouseleave', () => {
          awareness.awareness.setLocalStateField('mouse', null)
        })
      }

      // Handle remote cursors
      awareness.awareness.on('change', () => {
        const states = awareness.awareness.getStates()

        // Clear existing cursors
        const existingCursors = cursorContainer.querySelectorAll('.remote-mouse-cursor')
        existingCursors.forEach((cursor) => cursor.remove())

        // Add remote cursors
        states.forEach((state, clientId) => {
          if (clientId !== awareness.awareness.clientID && state.mouse) {
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

    // Improved sync logic with debouncing
    let isUpdating = false
    let pendingUpdate = false

    editor.model.document.on('change:data', () => {
      if (!isUpdating) {
        isUpdating = true
        const editorData = editor.getData()
        // Only update if content actually changed
        if (editorData !== ytext.toString()) {
          ytext.delete(0, ytext.length)
          ytext.insert(0, editorData)
        }
        isUpdating = false
      }
    })

    ytext.observe(() => {
      if (!isUpdating && !pendingUpdate) {
        pendingUpdate = true
        // Debounce the update to avoid rapid consecutive changes
        setTimeout(() => {
          isUpdating = true
          const content = ytext.toString()
          if (content !== editor.getData()) {
            editor.setData(content)
          }
          isUpdating = false
          pendingUpdate = false
        }, 50) // Small delay to batch rapid changes
      }
    })

    // Handle initial content
    this.providers.forEach((provider) => {
      if (provider instanceof WebsocketProvider) {
        provider.on('sync', (isSynced: boolean) => {
          if (isSynced) {
            const initialContent = ytext.toString()
            if (initialContent) {
              editor.setData(initialContent)
            }
          }
        })
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

    this.providers?.forEach((provider) => provider.destroy())
  }
}
