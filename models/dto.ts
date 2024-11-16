export interface ICountry {
  _id?: string;
  name?: string;
  flagUrl?: string;
  description?: INameAndLinks | undefined;
  orderNumber?: string;
  coords?: {
    top: number;
    left: number;
  };
  code?: string;
}
export interface IEvent {
  _id?: string;
  code?: string;
  countryIds?: Array<string>;
  priority?: Priority;
  type?: HappeningType;
  dates?: IEventDates;
  name?: string | undefined;
  description?: INameAndLinks | undefined;
}
export interface IEventDates {
  startDate: string;
  endDate?: string;
  halfCenturies: HalfCentury[];
}
export interface IAddCountryInput {
  name?: string;
  flagUrl?: string;
  description?: string;
  orderNumber?: string;
  countryId?: string;
  code?: string;
}
export type Priority = 1 | 2 | 3; // 1 = most important
export type HalfCentury = [number, boolean, boolean];
export enum HappeningTypeEnum {
  Person,
  Art,
  Invention,
  War,
}
export type HappeningType = "Person" | "Art" | "Invention" | "War";
export const HappeningTypeArr: Array<HappeningType> = [
  "Person",
  "Art",
  "Invention",
  "War",
];
export interface IHappeningOutput extends IHappeningInput {
  _id: string;
}
export interface IHappeningInput {
  code: string;
  countryIds: Array<string>;
  priority: Priority;
  type: HappeningTypeEnum;
  time: {
    startDate: string | null;
    endDate?: string | null;
  };
}
export interface IGetHappeningDataOutput extends IAddHappeningDataInput {
  _id: string;
}
export interface IAddHappeningDataInput {
  happeningId: string | undefined;
  name: string | undefined;
  description?: INameAndLinks | undefined;
}
export interface INameAndLinks {
  name: string | undefined;
  links: Array<ILink> | undefined;
}
export interface ILink {
  text: string;
  url: string;
}
export interface IForData {
  lang: string;
  id: string | undefined;
}
export interface IResponse<F, T> {
  translatable: T;
  fixed: F;
}
export interface IHappeningData {
  _id?: string;
  code?: string;
  descriptionLinks?: Array<ILink>;
  descriptionName?: string;
  happeningId?: string;
  name?: string;
  priority?: Priority;
  relatedCountryIds?: Array<string>;
  timeEndDate?: string | null;
  timeStartDate?: string | null;
  type?: HappeningTypeEnum;
}
