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
import {
  ClassicEditor,
  Bold,
  Essentials,
  Italic,
  Mention,
  Paragraph,
  Undo,
  List,
  ListProperties,
} from 'ckeditor5'
import CollaborationPlugin from './plugins/collaboration/Collaboration'
import { ref } from 'vue'

const editorData = ref('')

const handleEditorChange = (content: string) => {
  console.log('Editor content changed:', content)
}

const editorConfig = {
  plugins: [
    Bold,
    Essentials,
    Italic,
    Mention,
    Paragraph,
    Undo,
    CollaborationPlugin,
    List,
    ListProperties,
  ],
  toolbar: ['undo', 'redo', '|', 'bold', 'italic', '|', 'bulletedList', 'numberedList'],
  // Other configuration options...
}
</script>
