<template>
  <div class="fixed top-2 right-2 z-50">
    <ToastNotification
      v-for="message in errorMessages"
      :key="message"
      :duration="4500"
      :show-toast="true"
      :text="message"
    />
    <ToastNotification
      :text="'Folgende Module konnten nicht wiederhergestellt werden'"
      :show-toast="unknownModules?.length != 0"
      :list-items="unknownModules.map(u => `- ${u.id} in semester ${u.semesterNumber}`)"
      :dismiss-button-text="'Alle aus URL entfernen'"
      @on-dismiss="removeUnknownModulesFromUrl"
    />
  </div>
  <div class="flex space-x-2 overflow-auto before:m-auto after:m-auto p-4">
    <SemesterComponent
      v-for="semester in semesters"
      :key="semester.number"
      v-model:modules="semester.modules"
      class="bg-gray-200 rounded p-2 group/semester w-64 min-w-64"
      :title="semester.name ?? `${semester.number}`"
      :number="semester.number"
      :all-modules="modules"
      @on-module-deleted="(moduleId: string) => onModuleDeleted(semester.number, moduleId)"
      @on-add-module="addModule"
      @on-remove-semester="removeSemester"
      @on-drop-end="updateUrlFragment"
    />
    <button
      class="bg-gray-500 hover:bg-gray-800 transition-colors text-white w-8 px-2 rounded"
      type="button"
      @click="addSemester"
    >
      +
    </button>
  </div>
  <div class="my-16 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 justify-items-center gap-y-16">
    <article class="mx-4">
      <span class="text-xl">
        Übersicht der ECTS Punkte
      </span>
      <div class="my-2 flex items-center">
        <label for="last-semester-select">
          Erstes Semester:
        </label>
        <select
          id="last-semester-select"
          v-model="startSemester"
          class="ml-2 px-3 py-2 rounded"
        >
          <option
            v-for="semester in selectableStartSemesters"
            :key="semester.toString()"
            :value="semester"
          >
            {{ semester.toString() }}
          </option>
        </select>
        <a
          class="ml-3 underline"
          target="_blank"
          :href="studienOrdnungToUrlMap[studienordnung]"
        >Studienordnung</a>
      </div>
      <Categories
        :categories="mappedCategories"
        :total-earned-ects="totalEarnedEcts"
        :total-planned-ects="totalPlannedEcts"
        @on-add-module="addModule"
      />
    </article>
    <article class="mx-4">
      <h2 class="text-xl">
        Vertiefungen
      </h2>
      <div class="mt-5">
        <div
          v-for="focus in mappedFocuses"
          :key="focus.name"
        >
          <FocusComponent
            :name="focus.name"
            :available-modules-for-focus="focus.availableModules"
            :number-of-missing-modules="focus.numberOfMissingModules"
            @on-add-module-to-next-sem="addModule"
          />
        </div>
      </div>
    </article>
    <img
      class="lg:col-span-2 2xl:col-span-1 justify-self-center px-4"
      src="../assets/this_is_fine.jpg"
      alt="The well known 'this is fine' meme with a dog in a room full of fire"
    >
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import SemesterComponent from '../components/Semester.vue';
import FocusComponent from '../components/Focus.vue';
import ToastNotification from '../components/ToastNotification.vue';
import {getColorClassForCategoryId} from '../helpers/color-helper';
import {Category, Focus, Module, Semester, UnknownModule} from '../helpers/types';
import {parseQuery} from "vue-router";
import {SemesterInfo} from "../helpers/semester-info";
import Categories from '../components/Categories.vue';

const BASE_URL = 'https://raw.githubusercontent.com/StefanieJaeger/lost-university-data/SJ/data-preparation/data';
const ROUTE_MODULES = '/modules.json';
const ROUTE_CATEGORIES = '/categories.json';
const ROUTE_FOCUSES = '/focuses.json';

const currentSemester = SemesterInfo.now();

export default defineComponent({
  name: 'Home',
  components: { SemesterComponent, FocusComponent,  ToastNotification, Categories },
  data() {
    return {
      startSemester: undefined as SemesterInfo | undefined,
      studienordnung: '21' as '21' | '23',
      studienOrdnungToUrlMap: {
        '21': 'https://studien.ost.ch/allStudies/10191_I.html',
        '23': 'https://studien.ost.ch/allStudies/10246_I.html'
      },
      selectableStartSemesters: SemesterInfo.selectableStartSemesters,
      semesters: [] as Semester[],
      modules: [] as Module[],
      categories: [] as Category[],
      focuses: [] as Focus[],
      errorMessages: [] as string[],
      unknownModules: [] as UnknownModule[],
    };
  },
  computed: {
    mappedCategories() {
      return this.categories.map((category) => ({
        earnedCredits: this.getEarnedCredits(category),
        plannedCredits: this.getPlannedCredits(category),
        colorClass: getColorClassForCategoryId(category.id),
        ...category,
        modules: category.modules.map(module => this.modules.find(m => m.id === module.id)).filter(f => f)
      }));
    },
    plannedModules() {
      return this.semesters
        .flatMap((semester) => semester.modules);
    },
    mappedFocuses() {
      const plannedModuleIds = this.plannedModules.map((module) => module.id);
      const numberOfModulesRequiredToGetFocus = 8;
      return this.focuses.map((focus) => ({
        ...focus,
        numberOfMissingModules: Math.max(0, numberOfModulesRequiredToGetFocus - focus.modules
          .filter((module) => plannedModuleIds.includes(module.id))
          .length),
          availableModules: focus.modules
          .filter((module) => !plannedModuleIds.includes(module.id))
          .map((module) => this.modules.find(m => m.id === module.id))
      }));
    },
    totalPlannedEcts() {
      return this.getPlannedCredits();
    },
    totalEarnedEcts() {
      return this.getEarnedCredits();
    },
  },
  watch: {
    $route: {
      handler() {
        this.semesters = this.getPlanDataFromUrl();
      },
    },
    startSemester: {
      handler (newStartSemester) {
        this.updateUrlFragment()

        if (newStartSemester === undefined) {
          return
        }

        if (newStartSemester.year > 2023 || (newStartSemester.year === 2023 && !newStartSemester.isSpringSemester)) {
          this.studienordnung = '23';
        } else {
          this.studienordnung = '21';
        }

        this.semesters.forEach(s => s.setName(newStartSemester));
        this.modules.forEach(m => m.calculateNextPossibleSemester(newStartSemester));
      }
    },
    studienordnung: {
      async handler() {
        this.categories = await this.getCategories();
        this.focuses = await this.getFocuses();
      },
      immediate: true,
    },
  },
  async mounted() {
    this.modules = await this.getModules();
    this.semesters = this.getPlanDataFromUrl();
  },
  methods: {
    sumCredits: (previousTotal: number, module: Module) => previousTotal + module.ects,
    getColorClassForCategoryId,
    async getModules(): Promise<Module[]> {
      const response = await fetch(`${BASE_URL}${ROUTE_MODULES}`);
      return (await response.json()).map(m =>
        new Module(m.id, m.name, m.url, m.categories_for_coloring, m.ects, m.term)
      );
    },
    async getCategories(): Promise<Category[]> {
      const response = await fetch(`${BASE_URL}${this.studienordnung}${ROUTE_CATEGORIES}`);
      return (await response.json()).map(c => new Category(c.id, c.name, Number(c.required_ects), c.modules));
    },
    async getFocuses(): Promise<Focus[]> {
      const response = await fetch(`${BASE_URL}${this.studienordnung}${ROUTE_FOCUSES}`);
      return response.ok ? (await response.json()).map((f: Focus) => new Focus(f.id, f.name, f.modules)) : [];
    },
    getPlanDataFromUrl(): Semester[] {
      let path = window.location.hash;
      const planIndicator = '#/plan/';
      const moduleSeparator = '_';
      const semesterSeparator = '-';
      function isNullOrWhitespace(input: string) {
        return !input || !input.trim();
      }

      if (!path.startsWith(planIndicator)) {
        const cachedPlan = localStorage.getItem('plan');
        if (cachedPlan) {
          window.location.hash = cachedPlan;
          path = cachedPlan;
        }
      }

      if (path.startsWith(planIndicator)) {
        // This ensures backwards compatability. Removing it after everyone who started before 2022
        // has finished their studies, so about 2026, is guaranteed to be fine.
        const newPath = path
          .replace('BuPro', 'WI2')
          .replace('RheKI', 'RheKoI')
          .replace('SDW', 'IBN')
          .replace('FunProg', 'FP')
          .replace('BAI14', 'BAI21')
          .replace('SE1', 'SEP1')
          .replace('SE2', 'SEP2')
          .replace('NISec', 'NIoSec')
          .replace('PFSec', 'PlFSec')
          .replace('WIoT', 'WsoT');

        const [ hash, query ] = newPath.split('?');

        let newStartSemester = undefined;

        if (query != undefined) {
          const queryParameters = parseQuery(query);
          const startSemesterQueryParameter = queryParameters["startSemester"];

          if (typeof startSemesterQueryParameter === 'string') {
            newStartSemester = SemesterInfo.parse(startSemesterQueryParameter) ?? undefined;
          }
        }

        this.startSemester = newStartSemester;

        const planData = hash
          .slice(planIndicator.length)
          .split(semesterSeparator)
          .map((semesterPart, index) =>
          new Semester(index + 1, semesterPart
              .split(moduleSeparator)
              .filter((id) => !(isNullOrWhitespace(id)))
              .map((moduleId) => {
                const newModule = this.modules.find((module) => module.id === moduleId);
                if (!newModule) {
                  this.showUnknownModulesError(index + 1, moduleId);
                }
                return newModule!;
              })
              .filter((module) => module))
              .setName(this.startSemester)
          );

        if (newPath !== path) {
          window.location.hash = newPath;
        }

        this.savePlanInLocalStorage(newPath);

        return planData;
      }

      return [];
    },
    updateUrlFragment() {
      let encodedPlan = this.semesters
        .map((semester) => semester.modules.map((module) => module.id).join('_'))
        .join('-');

      if (this.startSemester !== undefined) {
        encodedPlan += `?startSemester=${this.startSemester.toString()}`
      }

      window.location.hash = `/plan/${encodedPlan}`;

      if (encodedPlan) {
        this.savePlanInLocalStorage(window.location.hash);
      }
    },
    savePlanInLocalStorage(path: string) {
      localStorage.setItem('plan', path);
    },
    getPlannedSemesterForModule(moduleName: string): number | undefined {
      return this.semesters.find(
        (semester) => semester.modules.some((module) => module.name === moduleName),
      )?.number;
    },
    getEarnedCredits(category?: Category): number {
      if (this.startSemester === undefined) {
        return 0;
      }

      const indexOfLastCompletedSemester = currentSemester.difference(this.startSemester);

      if (indexOfLastCompletedSemester < 0) {
        return 0;
      }

      return this.semesters
        .slice(0, indexOfLastCompletedSemester)
        .flatMap((semester) => semester.modules)
        .filter((module) => !category || category.modules.some((m) => m.id === module.id))
        .reduce(this.sumCredits, 0);
    },
    getPlannedCredits(category?: Category): number {
      if (this.startSemester === undefined) {
        return 0;
      }

      let semestersToConsider = this.semesters;
      const indexOfLastCompletedSemester = currentSemester.difference(this.startSemester);

      if (indexOfLastCompletedSemester >= 0) {
        semestersToConsider = semestersToConsider.slice(indexOfLastCompletedSemester)
      }

      return semestersToConsider
        .flatMap((semester) => semester.modules)
        .filter((module) => !category || category.modules.some((m) => m.id === module.id))
        .reduce(this.sumCredits, 0);
    },
    addModule(moduleName: string, semesterNumber?: number) {
      const blockingSemesterNumber = this.getPlannedSemesterForModule(moduleName);
      if (blockingSemesterNumber) {
        const text = `Modul ${moduleName} ist bereits im Semester ${blockingSemesterNumber}`;
        console.warn(text);
        this.showErrorMsg(text);
        return;
      }

      const module = this.modules.find((item) => item.name === moduleName);

      if (module === undefined) {
        this.showErrorMsg(`Modul '${moduleName}' existiert nicht`);
        return;
      }

      if(!semesterNumber) {
        if(!module.nextPossibleSemester) {
            this.showErrorMsg(`Kein nächstmögliches Semester für Modul ${moduleName} gefunden`);
            return;
        }
        let nextSemester = this.semesters.find(s => s.name === module.nextPossibleSemester.toString());
        while(!nextSemester) {
          this.addSemester();
          nextSemester = this.semesters.find(s => s.name === module.nextPossibleSemester.toString());
        }
        nextSemester.modules.push(module);
      } else {
        this.semesters[semesterNumber - 1].modules.push(module);
      }

      this.updateUrlFragment();
    },
    removeModule(semesterNumber: number, moduleId: string) {
      this.semesters[semesterNumber - 1].modules = this.semesters[semesterNumber - 1].modules
        .filter((module) => module.id !== moduleId);
      this.unknownModules = this.unknownModules.filter((f) => f.id !== moduleId);

      this.updateUrlFragment();
    },
    addSemester() {
      this.semesters.push(new Semester(this.semesters.length + 1, []).setName(this.startSemester));
    },
    removeSemester(semesterNumber: number) {
      this.semesters = this.semesters.filter((semester) => semester.number !== semesterNumber);
      this.unknownModules = this.unknownModules.filter((f) => f.semesterNumber !== semesterNumber);
      this.updateUrlFragment();
    },
    showErrorMsg(text: string) {
      this.errorMessages.push(text);
      setTimeout(() => {
        this.errorMessages.shift();
        // clean up error messages after a minute
      }, 60000);
    },
    showUnknownModulesError(semesterNumber: number, moduleId: string) {
      if (this.unknownModules.find((f) => f.id === moduleId)) return;
      this.unknownModules.push({ semesterNumber, id: moduleId });
    },
    removeUnknownModulesFromUrl() {
      this.unknownModules = [];
      this.updateUrlFragment();
    },
    onModuleDeleted(semesterNumber: number, moduleId: string) {
      this.removeModule(semesterNumber, moduleId);
    },
  },
});
</script>
