<template>
  <button
    v-if="!isSearching"
    class="h-8 bg-gray-800 text-white p-1 rounded"
    type="button"
    :class="widthClass"
    @click="startSearching()"
  >
    +
  </button>
  <div
    v-if="isSearching"
    class="w-72"
  >
    <Combobox
      :model-value="modelValue"
      by="id"
      @update:model-value="value => selectModule2(value)"
    >
      <div class="relative">
        <div class="relative w-full h-8 overflow-hidden rounded-t-lg shadow-md flex items-center">
          <ComboboxInput
            class="relative w-full border-none text-sm py-2 pl-3 pr-10 bg-gray-100"
            :display-value="(e) => e.id"
            @change="query = $event.target.value"
          />
          <ComboboxButton as="template">
            <button
              class="absolute right-2  my-auto"
              type="button"
              @click="isSearching = false"
            >
              <font-awesome-icon :icon="['fa', 'circle-xmark']" />
            </button>
          </ComboboxButton>
        </div>
        <ComboboxOptions
          static
          class="absolute max-h-72 w-full overflow-auto rounded-b-md shadow-lg bg-gray-100"
        >
          <div
            v-for="group in groupedModules"
            :key="group.id"
          >
            <div
              class="hover:cursor-pointer px-2 text-white flex justify-between items-center"
              :class="group.colorClassObject"
              :aria-expanded="group.isOpen"
              type="button"
              @click="toggleGroup(group.id)"
            >
              <span>{{ group.id }}</span>
              <font-awesome-icon
                :icon="['fa', group.isOpen ? 'chevron-up' : 'chevron-down']"
                class="h-5 w-5 ml-2"
              />
            </div>

            <ComboboxOption
              v-for="module in filteredModulesByGroup(group.id)"
              v-show="group.isOpen"
              :key="module.id"
              :value="module.name"
              as="template"
              :disabled="moduleIsDisabled(module)"
            >
              <li
                class="cursor-default pl-3 border-b border-slate-500 flex items-center"
                :class="moduleIsDisabled(module) ? 'text-gray-400 bg-gray-300' : ''"
              >
                <span
                  class="w-3/5 block break-words font-normal"
                >
                  {{ module.name }}
                </span>

                <div class="w-1/5 text-xs">
                  <span
                    v-if="moduleIsInPlan(module)"
                    class="italic"
                  >
                    geplant
                  </span>
                  <span v-else-if="module.isDeactivated">
                    inaktiv
                  </span>
                  <span v-else>
                    {{ module.ects }} ECTS
                  </span>
                </div>

                <div class="w-1/5 text-xs">
                  <span v-if="showNextPossibleSemester && module.nextPossibleSemester">
                    ({{ module.nextPossibleSemester }})
                  </span>
                  <span v-else-if="moduleHasWrongTerm(module)">
                    nur im {{ module.term }}
                  </span>
                  <span v-else>
                    {{ module.term }}
                  </span>
                </div>
              </li>
            </ComboboxOption>
          </div>
        </ComboboxOptions>
      </div>
    </Combobox>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { Module, Term } from '../helpers/types';
import { store } from '../helpers/store';
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
  ComboboxButton
  } from '@headlessui/vue';
import { getColorClassForCategoryId } from '../helpers/color-helper';

export type GroupedModule = {id: string, name: string, modules: Module[], isOpen: boolean, colorClassObject: object };

export default defineComponent({
  name: 'ModuleSearch',
  components: { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, ComboboxButton },
  props: {
    categoryId: {
      type: String,
      default: undefined
    },
    showNextPossibleSemester: {
      type: Boolean,
      required: true
    },
    widthClass: {
      type: Object,
      required: true
    },
    termForWhichToSearch: {
      type: String as () => Term,
      required: false,
      default: 'both'
    }
  },
  emits: ['on-module-selected'],
  data() {
    return {
      isSearching: false,
      searchId: Math.random(),
      modelValue: {},
      query: '',
      groupedModules: [] as GroupedModule[],
    };
  },
  methods: {
    selectModule(event: Event) {
      const el = (<HTMLSelectElement>event.currentTarget);
      this.$emit('on-module-selected', el.value);
      el.value = '';
      this.isSearching = false;
    },
    moduleIsDisabled(module: Module): boolean {
      return this.moduleIsInPlan(module) ||
        this.moduleHasWrongTerm(module) ||
        (this.showNextPossibleSemester && !module.nextPossibleSemester)
    },
    moduleIsInPlan(module: Module): boolean {
      return store.getters.plannedModuleIds.includes(module.id);
    },
    moduleHasWrongTerm(module: Module): boolean {
      if(this.termForWhichToSearch !== 'both' && module.term !== 'both') {
        return this.termForWhichToSearch !== module.term;
      }
      return false;
    },
    selectModule2(moduleName: string) {
      console.log(moduleName);
      this.$emit('on-module-selected', moduleName);
      this.isSearching = false;
    },
    startSearching() {
      if(!this.isSearching) {
        this.groupedModules = store.getters.enrichedCategories.map(c => {
          const colorClassObject = {};
          colorClassObject[getColorClassForCategoryId(c.id)] = true;
          return {
            id: c.id,
            name: c.name,
            modules: c.modules,
            isOpen: this.categoryId ? this.categoryId === c.id : true,
            colorClassObject
          };
        });
      }
      this.isSearching = true;
    },
    toggleGroup(id: string) {
      const group = this.groupedModules.find(f => f.id === id);
      group.isOpen = !group.isOpen;
      this.groupedModules = [...this.groupedModules];
    },
    filteredModulesByGroup(groupId: string) {
      const group = this.groupedModules.find(f => f.id === groupId);
      if (this.query === '') {
        return group?.modules;
      }
      return group?.modules.filter((module) => {
        return module.name.toLowerCase().includes(this.query.toLowerCase()) ||
          module.id.toLowerCase().includes(this.query.toLowerCase());
      })
    },
  },
});
</script>
