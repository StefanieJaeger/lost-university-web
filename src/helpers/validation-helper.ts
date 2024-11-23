import type { Module, Semester } from '../helpers/types';
import { SemesterInfo } from './semester-info';

export type ModuleValidationInfo = {
  type: 'soft' | 'hard';
  tooltip: string; // shown on module
  text?: string; // shown in global alert
  action?: () => void; // action in global alert (unsure if this works)
}

export class ValidationHelper {
  static getValidationInfoForModule(module: Module, allSemesters: Semester[]): ModuleValidationInfo | null {
    // todo: if module is duplicate, this will get first occurence. Could this cause problems?
    const semesterForModule = allSemesters.find(s => s.modules.some(m => m.id === module.id));
    if(!semesterForModule) {
      // module is not planned, does not need validation right now
      return null;
    }
    const semesterInfoForModule = SemesterInfo.parse(semesterForModule.name);
    const allPlannedModules = allSemesters.reduce((modules, sem) => [...modules, ...sem.modules], [] as Module[]); // make distinct?

    if(semesterInfoForModule == null) {
      return null;
    }

    if(this.isSemesterInThePast(semesterInfoForModule)) {
      console.log('past', module.id, module);
      if(this.isModuleInWrongSemester(module, semesterInfoForModule)) {
        return {type: 'soft', tooltip: `${module.name} findet nur im ${module.term} statt`};
      }
      if(this.isModuleAlreadyInPlan(module.id, allPlannedModules)) {
        // todo: reference semester
        // todo: give option to remove
        return {type: 'hard', tooltip: `Modul bereits geplant`};
      }
      if(this.isModuleInactive(module)) {
        // const successor = allModules.find(m => m.id === module.successorModuleId);
        if(module.successorModuleId) {
          // todo: give option to replace
          return {type: 'soft', tooltip: `Modul hat Nachfolger ${module.successorModuleId}`};
        }
      }
      return null;
    }

    if(this.isModuleInWrongSemester(module, semesterInfoForModule)) {
      return {type: 'hard', tooltip: `${module.name} findet nur im ${module.term} statt`};
    }
    if(this.isModuleAlreadyInPlan(module.id, allPlannedModules)) {
      // todo: reference semester
      // todo: give option to remove
      return {type: 'hard', tooltip: `Modul bereits geplant`}
    }
    if(this.isModuleInactive(module)) {
      // todo: reference semester
      return {type: 'hard', tooltip: `Module ${module.name} wird nicht mehr angeboten`};
    }
    if(this.isModuleBeforeRecommendedModules(module, semesterInfoForModule, allSemesters)) {
      return {type: 'soft', tooltip: `Empfohlene Module ${module.recommendedModuleIds.join(',')}`};
    }

    return null;
  }

  private static isSemesterInThePast(semesterInfo: SemesterInfo) {
    return semesterInfo.difference(SemesterInfo.now()) < 0
  }

private static isModuleInWrongSemester(module: Module, semesterInfo: SemesterInfo): boolean {
  return module.term === 'HS' ? semesterInfo.isSpringSemester : !semesterInfo.isSpringSemester;
}

private static isModuleAlreadyInPlan(moduleId: string, plannedModules: Module[]): boolean {
  return plannedModules.some(m => m.id === moduleId);
}

private static isModuleInactive(module: Module): boolean {
  // todo: logic
  // MGE -> inactive without successor
  // PF -> inactive with successor
  // todo: is there active with successor?
return false;
}

private static isModuleBeforeRecommendedModules(module: Module, semesterInfoForModule: SemesterInfo, allSemesters: Semester[]): boolean {
  // todo: logic
  return false;
}
}

