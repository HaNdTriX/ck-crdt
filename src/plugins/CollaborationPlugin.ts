import { Plugin } from 'ckeditor5'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export class CollaborationPlugin extends Plugin {
  static get pluginName() {
    return 'Collaboration'
  }

  init() {
    const editor = this.editor
    const ydoc = new Y.Doc()

    // Connect to WebSocket server
    const provider = new WebsocketProvider('ws://localhost:1234', 'ckeditor-room-3', ydoc, {
      connect: true,
    })

    const ytext = ydoc.getText('editor')

    // Set up awareness (cursor positions, user info)
    const awareness = provider.awareness
    awareness.setLocalState({
      user: {
        name: 'User ' + Math.floor(Math.random() * 100),
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      },
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
    provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        const initialContent = ytext.toString()
        if (initialContent) {
          editor.setData(initialContent)
        }
      }
    })
  }
}
