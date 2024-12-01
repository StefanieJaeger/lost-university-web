<template>
  <div class="relative flex justify-between px-4 rounded text-white group/module" :class="computedClasses" :title="tooltip">
    <div class="grid grid-cols-[minmax(0,_auto)_auto_auto] gap-2">
      <span class="">{{ accreditedModule.name }}</span>
      <span>-</span>
      <span>{{ accreditedModule.ects }}</span>
    </div>
    <div>
      <button
        class="absolute opacity-0 touch-only:opacity-75 group-hover/module:opacity-75
              hover:!opacity-100 right-2 transition-opacity duration-75"
        type="button"
        @click="removeModule"
      >
        <font-awesome-icon
          :icon="['fa', 'circle-xmark']"
          size="lg"
        />
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AccreditedModule } from '../helpers/types';
import { getColorClassForPrioritizedCategory } from '../helpers/color-helper';
import { store } from '../helpers/store';
import { StorageHelper } from '../helpers/storage-helper';

export default defineComponent({
  name: 'AccreditedModuleBadge',
  props: {
    accreditedModule: {
      type: Object as PropType<AccreditedModule>,
      required: true,
    }
  },
  computed: {
    computedClasses() {
      const classes = [this.getColorClassForPrioritizedCategory(this.accreditedModule.categoryIds)];
      if(this.accreditedModule.validationInfo) {
        classes.push(...['border-red-500', 'border-4']);
      } else {
        classes.push('p-[4px]');
      }
      return classes;
    },
    tooltip() {
      return this.accreditedModule.validationInfo?.tooltip ?? `${this.accreditedModule.name} - ${this.accreditedModule.ects} - ${this.accreditedModule.categoryIds.join(', ')}`;
    }
  },
  methods: {
    getColorClassForPrioritizedCategory,
    removeModule() {
      store.commit('removeAccreditedModule', this.accreditedModule);
      StorageHelper.updateUrlFragment();
    }
  }
});
</script>
