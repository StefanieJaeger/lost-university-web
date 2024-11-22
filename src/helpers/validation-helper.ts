import type { Module, Semester } from '../helpers/types';
import { SemesterInfo } from './semester-info';

export type ModuleValidationInfo = {
  type: 'soft' | 'hard';
  text: string;
}

export class ValidationHelper {
  static setValidationInfoForModule(module: Module, semesters: Semester[]) {
    const semesterForModule = semesters.find(s => s.modules.some(m => m.id === module.id));
    if(!semesterForModule) {
      // module is not planned, does not need validation right now
      return;
    }
    const semesterInfoForModule = SemesterInfo.parse(semesterForModule.name);
    const allPlannedModules = semesters.reduce((modules, sem) => [...modules, sem.modules], []); // make distinct?
    module.validationInfo = this.getValidationInfoForModule(module, allPlannedModules, semesterInfoForModule);
  }

  private static getValidationInfoForModule(module: Module, allPlannedModules: Module[], semesterInfo: SemesterInfo): ModuleValidationInfo {

  // }
  // static getValidationInfoForModule(module: Module, plannedModules: Module[], allModules: Module[], semesterInfo: SemesterInfo): ModuleValidationInfo | null {
    if(this.isSemesterInThePast(semesterInfo)) {
      if(this.isModuleInWrongSemester(module, semesterInfo)) {
        return {type: 'soft', text: `${module.name} findet nur im ${module.term} statt`};
      }
      if(this.isModuleAlreadyInPlan(module.id, allPlannedModules)) {
        // todo: reference semester
        // todo: give option to remove
        return {type: 'hard', text: `Modul bereits geplant`};
      }
      if(this.isModuleInactive(module)) {
        // const successor = allModules.find(m => m.id === module.successorModuleId);
        if(module.successorModuleId) {
          // todo: give option to replace
          return {type: 'soft', text: `Modul hat Nachfolger ${module.successorModuleId}`};
        }
      }
      return null;
    }

    if(this.isModuleInWrongSemester(module, semesterInfo)) {
      return {type: 'hard', text: `${module.name} findet nur im ${module.term} statt`};
    }
    if(this.isModuleAlreadyInPlan(module.id, allPlannedModules)) {
      // todo: reference semester
      // todo: give option to remove
      return {type: 'hard', text: `Modul bereits geplant`}
    }
    if(this.isModuleInactive(module)) {
      // todo: reference semester
      return {type: 'hard', text: `Module ${module.name} wird nicht mehr angeboten`};
    }
    if(this.isModuleBeforeRecommendedModules(module)) {
      return {type: 'soft', text: `Empfohlene Module ${module.recommendedModuleIds.join(',')}`};
    }
  }

  private static isSemesterInThePast(semesterInfo: SemesterInfo) {
    return semesterInfo.difference(SemesterInfo.now()) > 0
  }

private static isModuleInWrongSemester(module: Module, semesterInfo: SemesterInfo): boolean {
  return semesterInfo.isSpringSemester && module.term === 'FS';
}

private static isModuleAlreadyInPlan(moduleId: string, plannedModules: Module[]): boolean {
  return plannedModules.some(m => m.id === moduleId);
}

private static isModuleInactive(module: Module): boolean {
  // todo: logic
return false;
}

private static isModuleBeforeRecommendedModules(module: Module): boolean {
  // todo: logic
  return false;
}
}

