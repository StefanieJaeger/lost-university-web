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
    const allPlannedModules = allSemesters.reduce((modules, sem) => [...modules, ...sem.modules.flatMap(m =>({semesterNumber: sem.number, module: m}))], [] as ModuleAndSemesterNumber[]);

    const alreadyInPlanValidationInfo = this.getValidationInfoForModuleAlreadyInPlan(module.id, allPlannedModules);
    if (alreadyInPlanValidationInfo) {
      return alreadyInPlanValidationInfo;
    }

    // we now know, that only one semester contains the module
    const semesterForModule = allSemesters.find(s => s.modules.some(m => m.id === module.id));
    if(!semesterForModule) {
      // module is not planned, does not need validation right now
      return null;
    }
    const semesterInfoForModule = SemesterInfo.parse(semesterForModule.name);
    if(semesterInfoForModule == null) {
      return null;
    }

    if(this.isSemesterInThePast(semesterInfoForModule)) {
      if(this.isModuleInWrongSemester(module, semesterInfoForModule)) {
        return {type: 'soft', tooltip: `${module.name} findet nur im ${module.term} statt`};
      }
      if(this.isModuleInactive(module)) {
        if(module.successorModuleId) {
          // todo: give action to replace
          return {type: 'soft', tooltip: `Modul hat Nachfolger ${module.successorModuleId}`};
        }
      }
      return null;
    }

    if(this.isModuleInWrongSemester(module, semesterInfoForModule)) {
      return {type: 'hard', tooltip: `${module.name} findet nur im ${module.term} statt`};
    }
    if(this.isModuleInactive(module)) {
      return {type: 'hard', tooltip: `Modul ${module.name} wird nicht mehr angeboten`};
    }
    const moduleBeforeRecommendedModulesValidationInfo = this.getValidationInfoForModuleBeforeRecommendedModules(module, semesterForModule.number, allSemesters);
    if(moduleBeforeRecommendedModulesValidationInfo) {
      return moduleBeforeRecommendedModulesValidationInfo;
    }

    return null;
  }

  private static isSemesterInThePast(semesterInfo: SemesterInfo) {
    return semesterInfo.difference(SemesterInfo.now()) < 0
  }

  private static isModuleInWrongSemester(module: Module, semesterInfo: SemesterInfo): boolean {
    switch (module.term) {
      case 'FS':
        return !semesterInfo.isSpringSemester;
      case 'HS':
        return semesterInfo.isSpringSemester;
      case 'both':
        console.log('both', module.id);
        return false;
      default:
        console.error(`Invalid term ${module.term} for module ${module.id}`);
        return true;
    }
  }

  private static getValidationInfoForModuleAlreadyInPlan(moduleId: string, plannedModules: ModuleAndSemesterNumber[]): ModuleValidationInfo | null {
    // todo: give action to remove second occurence
    const occurences = plannedModules.filter(m => m.module.id === moduleId);
    if(occurences.length <= 1) {
      return null;
    }
    return { type: 'hard', tooltip: `Modul is doppelt im Plan, in Semester ${occurences.map(m => m.semesterNumber).join(', ')}` };
  }

  private static isModuleInactive(module: Module): boolean {
    return module.isDeactivated;
  }

  private static getValidationInfoForModuleBeforeRecommendedModules(module: Module, semesterNumberForModule: number, allSemesters: Semester[]): ModuleValidationInfo | null {
    if(!module.recommendedModuleIds.length) {
      return null;
    }

    const missingOrLater = module.recommendedModuleIds
      .map(moduleId =>
        ({moduleId, semesterNumber: allSemesters.find(semester => semester.moduleIds.includes(moduleId))?.number})
      )
      .filter(({semesterNumber}) =>
        !semesterNumber || semesterNumber > semesterNumberForModule
      );

    return {type: 'soft', tooltip: `Empfohlene Module ${missingOrLater.map(m => m.moduleId).join(',')}`};
  }
}

type ModuleAndSemesterNumber = {
  semesterNumber: number;
  module: Module;
};

