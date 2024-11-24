import type { Module, Semester } from '../helpers/types';
import { SemesterInfo } from './semester-info';
import { store } from './store';

export type ModuleValidationInfo = { severity: 'soft' | 'hard', tooltip: string } & ({type: 'duplicate', affectedSemesterNumbers: number[] } | {type: 'wrongSemester', targetSemesterNumber: number} | {type: 'inactive', successorModuleId: string | undefined} | {type: 'beforeRecommended', missingModuleIds: string[], laterModuleIds: string[]});

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
        const targetSemesterNumber = semesterForModule.number + 1;
        return { type: 'wrongSemester', targetSemesterNumber,  severity: 'soft', tooltip: `${module.name} findet nur im ${module.term} statt`};
      }
      if(this.isModuleInactive(module)) {
        if(module.successorModuleId) {
          return { type: 'inactive', successorModuleId: module.successorModuleId, severity: 'soft', tooltip: `Modul hat Nachfolger ${module.successorModuleId}`};
        }
      }
      return null;
    }

    if(this.isModuleInWrongSemester(module, semesterInfoForModule)) {
      const targetSemesterNumber = semesterForModule.number + 1;
      return { type: 'wrongSemester', targetSemesterNumber, severity: 'hard', tooltip: `${module.name} findet nur im ${module.term} statt`};
    }
    if(this.isModuleInactive(module)) {
      return { type: 'inactive', successorModuleId: module.successorModuleId, severity: 'hard', tooltip: `Modul ${module.name} wird nicht mehr angeboten`};
    }
    const moduleBeforeRecommendedModulesValidationInfo = this.getValidationInfoForModuleBeforeRecommendedModules(module, semesterForModule.number, allSemesters);
    if(moduleBeforeRecommendedModulesValidationInfo) {
      return moduleBeforeRecommendedModulesValidationInfo;
    }

    return null;
  }

  private static isSemesterInThePast(semesterInfo: SemesterInfo) {
    return semesterInfo.difference(SemesterInfo.now()) < 0;
  }

  private static isModuleInWrongSemester(module: Module, semesterInfo: SemesterInfo): boolean {
    switch (module.term) {
      case 'FS':
        return !semesterInfo.isSpringSemester;
      case 'HS':
        return semesterInfo.isSpringSemester;
      case 'both':
        return false;
      default:
        console.error(`Invalid term ${module.term} for module ${module.id}`);
        return true;
    }
  }

  private static getValidationInfoForModuleAlreadyInPlan(moduleId: string, plannedModules: ModuleAndSemesterNumber[]): ModuleValidationInfo | null {
    const occurences = plannedModules.filter(m => m.module.id === moduleId);
    if(occurences.length <= 1) {
      return null;
    }
    const affectedSemesterNumbers = occurences.slice(1).map(m => m.semesterNumber);
    return { type: 'duplicate', affectedSemesterNumbers, severity: 'hard', tooltip: `Modul is doppelt im Plan, in Semester ${occurences.map(m => m.semesterNumber).join(', ')}` };
  }

  private static isModuleInactive(module: Module): boolean {
    return module.isDeactivated;
  }

  private static getValidationInfoForModuleBeforeRecommendedModules(module: Module, semesterNumberForModule: number, allSemesters: Semester[]): ModuleValidationInfo | null {
    if(module.recommendedModuleIds.length === 0) {
      return null;
    }

    const missing = [];
    const later = [];
    for (const recommendedModuleId of module.recommendedModuleIds) {
      const position = this.getPositionOfModuleInPlan(recommendedModuleId, allSemesters, semesterNumberForModule);
      if (position === 'later') {
        later.push(recommendedModuleId);
      } else if(position === 'missing') {
        missing.push(recommendedModuleId);
      }
    }

    if(missing.length == 0 && later.length == 0) {
      return null;
    }

    const tooltipForMissing = missing.length ? `Nicht eingeplante, empfohlene Module: ${missing.join(', ')}` : '';
    const tooltipForLater = later.length ? `Später eingeplante, empfohelen Module: ${later.join(', ')}` : '';

    return { type: 'beforeRecommended', missingModuleIds: missing, laterModuleIds: later, severity: 'soft', tooltip: [tooltipForMissing, tooltipForLater].filter(f => f).join('\n')};
  }

  private static getPositionOfModuleInPlan(moduleId: string, allSemesters: Semester[], referenceSemesterNumber: number): 'sameOrEarlier' | 'later' | 'missing' {
    const semesterNumberForModule = this.getSemesterNumberForModuleId(moduleId, allSemesters);
    if(semesterNumberForModule) {
      if (semesterNumberForModule <= referenceSemesterNumber) {
        return 'sameOrEarlier';
      }
      if (semesterNumberForModule > referenceSemesterNumber) {
        return 'later';
      }
    }

    const successor = store.getters.modules.find(m => m.predecessorModuleId === moduleId);
    if(!successor) {
      return 'missing';
    }
    return this.getPositionOfModuleInPlan(successor.id, allSemesters, referenceSemesterNumber);
  }


  private static getSemesterNumberForModuleId(moduleId: string, allSemesters: Semester[]): number | undefined {
    return allSemesters.find(sem => sem.moduleIds.includes(moduleId))?.number;
  }
}

type ModuleAndSemesterNumber = {
  semesterNumber: number;
  module: Module;
};

