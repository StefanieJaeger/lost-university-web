import { createStore } from 'vuex'
import { Category, Focus, Module, Semester } from './types';
import { SemesterInfo } from './semester-info';
import {getColorClassForCategoryId} from '../helpers/color-helper';

const BASE_URL = 'https://raw.githubusercontent.com/StefanieJaeger/lost-university-data/SJ/data-preparation/data';
const ROUTE_MODULES = '/modules.json';
const ROUTE_CATEGORIES = '/categories.json';
const ROUTE_FOCUSES = '/focuses.json';

export const store = createStore({
  state () {
    return {
      modules: [] as Module[],
      categories: [] as Category[],
      semesters: [] as Semester[],
      focuses: [] as Focus[],
      startSemester: undefined as SemesterInfo | undefined,
      studienordnung: '21' as '21' | '23',
      validationEnabled: true,
    }
  },
  getters: {
    modules: state => state.modules,
    getModulesByIds: state => moduleIds => {
      return moduleIds.map((id) => state.modules.find((module) => module.id === id)).filter(f => f);
    },
    plannedModuleIds: state => state.semesters.flatMap(semester => semester.moduleIds),
    startSemester: state => state.startSemester,
    studienordnung: state => state.studienordnung,
    validationEnabled: state => state.validationEnabled,
    enrichedCategories: (state, getters) => {
      return state.categories.map(category => ({
        earnedCredits: getEarnedCredits(category),
        plannedCredits: getPlannedCredits(category),
        colorClass: getColorClassForCategoryId(category.id),
        ...category,
        modules: getters.getModulesByIds(category.moduleIds),
      }));
    },
    enrichedFocuses: (state, getters) => {
      const plannedModuleIds = getters.plannedModuleIds;
      const numberOfModulesRequiredToGetFocus = 8;
      return state.focuses.map(focus => ({
        ...focus,
        numberOfMissingModules: Math.max(0, numberOfModulesRequiredToGetFocus - focus.moduleIds.filter(moduleId => plannedModuleIds.includes(moduleId)).length),
        availableModules: getters.getModulesByIds(focus.moduleIds.filter(moduleId => !plannedModuleIds.includes(moduleId))),
        modules: getters.getModulesByIds(focus.moduleIds),
      }));
    },
    enrichedSemesters: (state, getters) => {
      return state.semesters.map(semester => ({
        ...semester,
        modules: getters.getModulesByIds(semester.moduleIds),
      }));
    },
  },
  mutations: {
    setModules(state, modules: Module[]) {
      state.modules = modules;
    },
    setCategories(state, categories: Category[]) {
      state.categories = categories;
    },
    setSemesters(state, semesters: Semester[]) {
      state.semesters = semesters;
    },
    setFocuses(state, focuses: Focus[]) {
      state.focuses = focuses;
    },
    setStartSemester(state, startSemester: SemesterInfo) {
      state.startSemester = startSemester;
    },
    setStudienordnung(state, studienordnung: '21' | '23') {
      state.studienordnung = studienordnung;
    },
    setValidationEnabled(state, validationEnabled: boolean) {
      state.validationEnabled = validationEnabled;
    },

    addSemester(state) {
      const newSemester = new Semester(state.semesters.length + 1, []).setName(state.startSemester);
      state.semesters.push(newSemester);
    },
    removeSemester(state, semesterNumber: number) {
      state.semesters.splice(state.semesters.findIndex(f => f.number === semesterNumber), 1);
    },
    removeModuleFromSemester(state, data: {semesterNumber: number, moduleId: string}) {
      const semester = state.semesters.find(s => s.number === data.semesterNumber);
      const index = semester.moduleIds.findIndex(moduleId => moduleId === data.moduleId);
      semester.moduleIds.splice(index, 1);
    },
    addModuleToSemester(state, data: {semesterNumber: number, moduleId: string}) {
      state.semesters.find(s => s.number === data.semesterNumber).moduleIds.push(data.moduleId);
    },
    updateNameOfAllSemesters(state) {
      state.semesters.forEach(s => s.setName(state.startSemester));
    },
    updateNextPossibleSemesterOfAllModules(state) {
      state.modules.forEach(m => m.calculateNextPossibleSemester(state.startSemester))
    },
  },
  actions: {
    async loadModules (context) {
      const response = await fetch(`${BASE_URL}${ROUTE_MODULES}`);
      const json = await response.json();
      const modules = json.map(m => new Module(m.id, m.name, m.url, m.categories_for_coloring, Number(m.ects), m.term))
      context.commit('setModules', modules);
    },
    async loadCategories (context) {
      const response = await fetch(`${BASE_URL}${store.getters.studienordnung}${ROUTE_CATEGORIES}`);
      const json = await response.json();
      const categories = json.map(c => new Category(c.id, c.name, Number(c.required_ects), c.modules.map(m => m.id)));
      context.commit('setCategories', categories);
    },
    async loadFocuses (context) {
      const response = await fetch(`${BASE_URL}${store.getters.studienordnung}${ROUTE_FOCUSES}`);
      const json = await response.json();
      const focuses = json.map(f => new Focus(f.id, f.name, f.modules.map(m => m.id)));
      context.commit('setFocuses', focuses);
    },
    async setStartSemester (context, startSemester: SemesterInfo) {
      context.commit('setStartSemester', startSemester);

      if(startSemester?.year > 2023 || (startSemester?.year === 2023 && !startSemester?.isSpringSemester)) {
        context.commit('setStudienordnung', '23');
      } else {
        context.commit('setStudienordnung', '21');
      }

      // todo: these are called, even if studienordnung stays the same...
      await store.dispatch('loadCategories');
      await store.dispatch('loadFocuses');

      context.commit('updateNameOfAllSemesters');
      context.commit('updateNextPossibleSemesterOfAllModules');
      store.dispatch('updateValidationInfoOfAllModules');
    },
    updateValidationInfoOfAllModules(context) {
      if(context.getters.validationEnabled) {
        context.getters.modules.forEach(module => module.validateModule(context.getters.enrichedSemesters));
      }
    },
  }
});

function getEarnedCredits(category: Category | undefined): number {
  if (store.getters.startSemester === undefined) {
    return 0;
  }
  const indexOfLastCompletedSemester = SemesterInfo.now().difference(store.getters.startSemester);

  if (indexOfLastCompletedSemester < 0) {
    return 0;
  }

  return store.getters.enrichedSemesters
    .slice(0, indexOfLastCompletedSemester)
    .flatMap((semester) => semester.modules)
    .filter((module) => !category || category.moduleIds.includes(module.id))
    .reduce(sumCredits, 0);
}

function getPlannedCredits(category: Category | undefined): number {
  if (store.getters.startSemester === undefined) {
    return 0;
  }

  let semestersToConsider = store.getters.enrichedSemesters;
  const indexOfLastCompletedSemester = SemesterInfo.now().difference(store.getters.startSemester);

  if (indexOfLastCompletedSemester >= 0) {
    semestersToConsider = semestersToConsider.slice(indexOfLastCompletedSemester)
  }

  return semestersToConsider
    .flatMap((semester) => semester.modules)
    .filter((module) => !category || category.moduleIds.includes(module.id))
    .reduce(sumCredits, 0);
}

function sumCredits(previousTotal: number, module: Module): number {
  return previousTotal + module.ects;
}


