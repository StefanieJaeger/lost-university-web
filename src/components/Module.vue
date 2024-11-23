<template>
  <div
    :key="module.name"
    class="rounded group/module relative p-2 px-8 flex flex-col items-center text-center text-white w-full"
    :style="{ 'background-color': getCategoryColorForModule(module) }"
  >
  <div class="absolute left-2">
    <font-awesome-icon v-if="module.validationInfo && module.validationInfo.type === 'soft'" :icon="['fa', 'info-circle']"></font-awesome-icon>
    <font-awesome-icon v-if="module.validationInfo && module.validationInfo.type === 'hard'" :icon="['fa', 'circle-exclamation']"></font-awesome-icon>
  </div>
    <button
      class="absolute opacity-0 touch-only:opacity-75 group-hover/module:opacity-75
             hover:!opacity-100 right-2 transition-opacity duration-75"
      type="button"
      @click="$emit('on-delete', module.id)"
    >
      <font-awesome-icon
        :icon="['fa', 'circle-xmark']"
        size="lg"
      />
    </button>
    <a
      class="font-bold hover:underline"
      target="_blank"
      :href="'https://studien.ost.ch/' + module.url.replace('.json', '.html')"
    >{{ module.name }}
    </a>
    <p>{{ module.ects }} ECTS</p>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { getCategoryColorForModule } from '../helpers/color-helper';
import type { Module } from '../helpers/types';

export default defineComponent({
  name: 'Module',
  props: {
    module: {
      type: Object as PropType<Module>,
      required: true,
    }
  },
  emits: ['on-delete'],
  methods: {
    getCategoryColorForModule,
  },
});
</script>
