import {parseQuery} from "vue-router";
import { SemesterInfo } from "./semester-info";
import { Semester } from "./types";
import { store } from "./store";

export class StorageHelper {
  private static readonly LOCALSTORAGE_PLAN_KEY = 'plan';
  private static readonly URL_PLAN_KEY = 'plan';
  private static readonly URL_MODULE_SEPARATOR = '_';
  private static readonly URL_SEMESTER_SEPARATOR = '-';
  private static readonly URL_START_SEMESTER_KEY = 'startSemester';
  private static readonly URL_VALIDATION_ENABLED_KEY = 'validation';

  static getDataFromUrlHash(urlHash: string, unknownModuleCallback: (semesterNumber: number, moduleId: string) => void): [Semester[], SemesterInfo | undefined, boolean] {
      const planIndicator = `#/${this.URL_PLAN_KEY}/`;

      if (!urlHash.startsWith(planIndicator)) {
        const cachedPlan = localStorage.getItem(this.LOCALSTORAGE_PLAN_KEY);
        if (cachedPlan) {
          window.location.hash = cachedPlan;
          urlHash = cachedPlan;
        }
      }

      if (urlHash.startsWith(planIndicator)) {
        const [ hash, query ] = urlHash.split('?');

        let newStartSemester = undefined;
        let validation = true;

        if (query != undefined) {
          const queryParameters = parseQuery(query);
          const startSemesterQueryParameter = queryParameters[this.URL_START_SEMESTER_KEY];
          const validationQueryParameter = queryParameters[this.URL_VALIDATION_ENABLED_KEY];

          if (typeof startSemesterQueryParameter === 'string') {
            newStartSemester = SemesterInfo.parse(startSemesterQueryParameter) ?? undefined;
          }
          validation = validationQueryParameter === 'false' ? false : true;
        }

        const newSemesters = hash
          .slice(planIndicator.length)
          .split(this.URL_SEMESTER_SEPARATOR)
          .map((semesterPart, index) =>
            new Semester(index + 1, this.getModuleIdsFromSemesterPart(semesterPart, unknownModuleCallback)).setName(newStartSemester)
          );

        const newestHash = `${planIndicator}${this.turnPlanDataIntoUrlHash(newSemesters, newStartSemester, validation)}`;
        if (urlHash !== newestHash) {
          window.location.hash = newestHash;
        }

        this.savePlanInLocalStorage(newestHash);

        return [newSemesters, newStartSemester, validation];
      }

      return [[], undefined, true];
  }

  static updateUrlFragment(semesters: Semester[], startSemester: SemesterInfo, validationEnabled: boolean) {
    const plan = this.turnPlanDataIntoUrlHash(semesters, startSemester, validationEnabled);

    window.location.hash = `/${this.URL_PLAN_KEY}/${plan}`;

    if (plan) {
      this.savePlanInLocalStorage(window.location.hash);
    }
  }

  private static turnPlanDataIntoUrlHash(semesters: Semester[], startSemester: SemesterInfo | undefined, validationEnabled: boolean): string {
    let plan = semesters
      .map((semester) => semester.moduleIds.join(this.URL_MODULE_SEPARATOR))
      .join(this.URL_SEMESTER_SEPARATOR);

    const query = [];
    if (startSemester !== undefined) {
      query.push(`${this.URL_START_SEMESTER_KEY}=${startSemester.toString()}`);
    }
    if(validationEnabled !== true) {
      query.push(`${this.URL_VALIDATION_ENABLED_KEY}=${validationEnabled}`);
    }
    if(query.length) {
      plan += `?${query.join('&')}`;
    }

    return plan;
  }

  private static savePlanInLocalStorage(path: string) {
    localStorage.setItem(this.LOCALSTORAGE_PLAN_KEY, path);
  }

  private static isNullOrWhitespace(input: string) {
    return !input || !input.trim();
  }

  private static getModuleIdsFromSemesterPart(semesterPart: string, unknownModuleCallback: (semesterNumber: number, moduleId: string) => void): string[] {
    const moduleIds = semesterPart
      .split(this.URL_MODULE_SEPARATOR)
      .filter(moduleId => !(this.isNullOrWhitespace(moduleId)));

    // even if we cannot find a module, we might be able to find its successor, with which we will replace it
    return moduleIds.map((moduleId, index) => {
      if(!store.getters.modules.find(m => m.id === moduleId)) {
        const successorModuleId = store.getters.modules.find(m => m.predecessorModuleId === moduleId)?.id;
        if(!successorModuleId) {
          unknownModuleCallback?.(index + 1, moduleId);
          return null;
        }
        return successorModuleId;
      }
      return moduleId;
    }).filter(f => f).map(m => m!);
  }
}
