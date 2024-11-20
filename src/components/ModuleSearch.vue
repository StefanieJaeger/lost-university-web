<template>
<div class="w-72">
    <Combobox :modelValue="modelValue"
    @update:modelValue="value => selectModule2(value)"
    by="id">
      <div class="relative mt-1">
        <div
          class="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm"
        >
          <ComboboxInput
            class="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            @change="query = $event.target.value"
            :displayValue="(e) => e.id"
          />
          <ComboboxButton
            class="absolute inset-y-0 right-0 flex items-center pr-2"
          >
          V
          </ComboboxButton>
        </div>
        <!-- <TransitionRoot
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          @after-leave="query = ''"
        > -->
          <ComboboxOptions
            class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
          >
            <div v-for="group in groupedModules">
              <div
    class="hover:cursor-pointer border border-gray-300 hover:border-gray-600 flex items-center space-x-2 p-2"
    :aria-expanded="group.isOpen"
    type="button"
    @click="toggleGroup(group.id)"
  >
            <span>{{ group.id }}</span>
          </div>
            <ComboboxOption
            v-show="group.isOpen"
              v-for="module in filteredModulesByGroup(group.id)"
              as="template"
              :key="module.id"
              :value="module.name"
            >
              <li
                class="relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
              >
                <span
                  class="block truncate font-normal"
                >
                  {{ module.name }}
                </span>
              </li>
            </ComboboxOption>
          </div>
          </ComboboxOptions>
        <!-- </TransitionRoot> -->
      </div>
    </Combobox>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { Module } from '../helpers/types';
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption, TransitionRoot, ComboboxButton
  } from '@headlessui/vue';

export type GroupedModule = {id: string, name: string, modules: Module[], isOpen: boolean};

export default defineComponent({
  name: 'ModuleSearch',
  components: {  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption, TransitionRoot, ComboboxButton},
  props: {
    modules: {
      type: Array<Module>,
    },
    groupedModules: {
      type: Array<GroupedModule>
    },
    showNextPossibleSemester: {
      type: Boolean,
      required: true
    },
    widthClass: {
      type: Object,
      required: true
    }
  },
  emits: ['on-module-selected'],
  data() {
    return {
      isSearching: false,
      searchId: Math.random(),
      modelValue: {},
      // groupedModules: [
      //   {
      //     id: 'Cat1',
      //     isOpen: true,
      //     modules: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B'}, { id: 'c', name: 'C'}]
      //   },
      //   {
      //     id: 'Cat2',
      //     isOpen: false,
      //     modules: [{ id: 'a', name: 'A' }, { id: 'd', name: 'D'}, { id: 'e', name: 'E'}]
      //   }
      // ],
      query: '',
    };
  },
  // computed: {
  //   filteredModules() {
  //     return this.query === ''
  //     ? this.modules
  //     : this.modules.filter((module) => {
  //         return module.name.toLowerCase().includes(this.query.toLowerCase());
  //       })
  //   },
  // },
  watch: {
    modules: {
      deep: true,
      immediate: false,
      handler() {
        this.isSearching = false;
      },
    },
  },
  methods: {
    selectModule2(a: any) {
      console.log(a);
    },
    selectModule(event: Event) {
      const el = (<HTMLSelectElement>event.currentTarget);
      this.$emit('on-module-selected', el.value);
      el.value = '';
      this.isSearching = false;
    },
    toggleGroup(id: string) {
      const group = this.groupedModules.find(f => f.id === id);
      group.isOpen = !group.isOpen;
    },
    filteredModulesByGroup(groupId: string) {
      return this.query === ''
      ? this.groupedModules.find(f => f.id === groupId).modules
      : this.groupedModules.find(f => f.id === groupId).modules.filter((module) => {
          return module.name.toLowerCase().includes(this.query.toLowerCase());
        });
    }
  },
});
</script>
