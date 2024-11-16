import { SemesterInfo } from "./semester-info";

export type Module = {
  id: string,
  name: string,
  url: string,
  categories_for_coloring: string[],
  ects: number,
  term: 'FS' | 'HS',

  // undefined means there cannot be a next semester for this module (reached max semesters)
  nextPossibleSemester: SemesterInfo | undefined,
};

export type Focus = {
  id: string,
  name: string,
  modules: Module[],
};

export type Category = {
  id: string,
  name: string,
  required_ects: number,
  modules: Module[],
};

export type Semester = {
  number: number,
  name: string | undefined,
  modules: Module[],
};

export type UnknownModule = {
  id: string,
  semesterNumber: number,
};

export type Contributor = {
  name: string,
  githubHandle: string,
};
