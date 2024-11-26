<template>
  <div id="app">
    <ckeditor
      :model-value="editorData"
      @update:model-value="handleEditorChange"
      :editor="ClassicEditor"
      :config="editorConfig"
    />
  </div>
</template>

<script lang="ts" setup>
import { ClassicEditor, Bold, Essentials, Italic, Mention, Paragraph, Undo } from 'ckeditor5'
import { CollaborationPlugin } from './plugins/CollaborationPlugin'
import { ref } from 'vue'

const editorData = ref('')

const handleEditorChange = (content: string) => {
  console.log('Editor content changed:', content)
}

const editorConfig = {
  plugins: [Bold, Essentials, Italic, Mention, Paragraph, Undo, CollaborationPlugin],
  toolbar: ['undo', 'redo', '|', 'bold', 'italic'],
  // Other configuration options...
}
</script>
