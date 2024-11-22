import {parseQuery} from "vue-router";
import { SemesterInfo } from "./semester-info";
import { Semester, Module } from "./types";

export class StorageHelper {
  private static readonly LOCALSTORAGE_PLAN_KEY = 'plan';
  private static readonly URL_PLAN_KEY = 'plan';
  private static readonly URL_MODULE_SEPARATOR = '_';
  private static readonly URL_SEMESTER_SEPARATOR = '-';
  private static readonly URL_START_SEMESTER_KEY = 'startSemester';
  private static readonly URL_VALIDATION_ENABLED_KEY = 'validation';

  private static readonly MODULE_REPLACEMENT_MAP: {[key: string]: string} = {
    'BuPro': 'WI2',
    'RheKI': 'RheKoI',
    'SDW': 'IBN',
    'FunProg': 'FP',
    'BAI14': 'BAI21',
    'SE1': 'SEP1',
    'SE2': 'SEP2',
    'NISec': 'NIoSec',
    'PFSec': 'PlFSec',
    'WIoT': 'WsoT',
  }

  static getDataFromUrlHash(urlHash: string, getModuleById: (id: string, index: number) => Module): [Semester[], SemesterInfo, boolean] {
      const planIndicator = `#/${this.URL_PLAN_KEY}/`;

      if (!urlHash.startsWith(planIndicator)) {
        const cachedPlan = localStorage.getItem(this.LOCALSTORAGE_PLAN_KEY);
        if (cachedPlan) {
          window.location.hash = cachedPlan;
          urlHash = cachedPlan;
        }
      }

      if (urlHash.startsWith(planIndicator)) {
        // This ensures backwards compatability. Removing it after everyone who started before 2022
        // has finished their studies, so about 2026, is guaranteed to be fine.
        const cleanedHash = Object.keys(this.MODULE_REPLACEMENT_MAP).reduce((result, key) => result.replace(key, this.MODULE_REPLACEMENT_MAP[key]), urlHash);

        const [ hash, query ] = cleanedHash.split('?');

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

        const planData = hash
          .slice(planIndicator.length)
          .split(this.URL_SEMESTER_SEPARATOR)
          .map((semesterPart, index) =>
          new Semester(index + 1, semesterPart
              .split(this.URL_MODULE_SEPARATOR)
              .filter((id) => !(this.isNullOrWhitespace(id)))
              .map((moduleId) => getModuleById(moduleId, index))
              .filter((module) => module))
              .setName(newStartSemester)
          );

        if (cleanedHash !== urlHash) {
          window.location.hash = cleanedHash;
        }

        this.savePlanInLocalStorage(cleanedHash);

        return [planData, newStartSemester, validation];
      }

      return [[], undefined, true];
  }

  static updateUrlFragment(semesters: Semester[], startSemester: SemesterInfo, validationEnabled: boolean) {
    let plan = semesters
      .map((semester) => semester.modules.map((module) => module.id).join(this.URL_MODULE_SEPARATOR))
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

    window.location.hash = `/${this.URL_PLAN_KEY}/${plan}`;

    if (plan) {
      this.savePlanInLocalStorage(window.location.hash);
    }
  }

  private static savePlanInLocalStorage(path: string) {
    localStorage.setItem(this.LOCALSTORAGE_PLAN_KEY, path);
  }

  private static isNullOrWhitespace(input: string) {
    return !input || !input.trim();
  }
}
