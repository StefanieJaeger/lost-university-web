import { SemesterInfo } from "./semester-info";
import { ValidationHelper, type ModuleValidationInfo } from "./validation-helper";

export type Term = 'FS' | 'HS';

export class Module {
  id: string;
  name: string;
  url: string;
  categoriesForColoring: string[];
  ects: number;
  term: Term;
  successorModuleId: string | undefined;
  predecessorModuleId: string | undefined;
  recommendedModuleIds: string[];
  dependentModuleIds: string[];

  // undefined means there cannot be a next semester for this module (reached max semesters)
  nextPossibleSemester: SemesterInfo | undefined;
  validationInfo: ModuleValidationInfo;

  constructor(id: string, name: string, url: string, categoriesForColoring: string[], ects: number, term: Term) {
    this.id = id;
    this.name = name;
    this.url = url;
    this.categoriesForColoring = categoriesForColoring;
    this.ects = ects;
    this.term = term;
  }

  calculateNextPossibleSemester(startSemester: SemesterInfo) {
    this.nextPossibleSemester = SemesterInfo.getNextPossibleSemesterForModule(this.term, startSemester);
  }

  validateModule(allSemesters: Semester[]) {
    this.validationInfo = ValidationHelper.getValidationInfoForModule(this, allSemesters);
  }
}

export class Focus {
  id: string;
  name: string;
  modules: Module[];
  moduleIds: string[]

  constructor(id: string, name: string, moduleIds: string[]) {
    this.id = id;
    this.name = name;
    this.moduleIds = moduleIds;
  }
}

export class Category {
  id: string;
  name: string;
  requiredEcts: number;
  modules: Module[];
  moduleIds: string[];

  constructor(id: string, name: string, requiredEcts: number, moduleIds: string[]) {
    this.id = id;
    this.name = name;
    this.requiredEcts = requiredEcts;
    this.moduleIds = moduleIds;
  }
}

export class Semester {
  number: number;
  name: string | undefined;
  modules: Module[];
  moduleIds: string[]

  constructor(number: number, moduleIds: string[]) {
    this.number = number;
    this.moduleIds = moduleIds;
  }

  setName(startSemester: SemesterInfo | undefined): Semester {
    this.name = startSemester ? startSemester.plus(this.number - 1).toString() : undefined;
    return this;
  }
}

export class UnknownModule {
  id: string;
  semesterNumber: number;
}

export class Contributor {
  name: string;
  githubHandle: string;
}
