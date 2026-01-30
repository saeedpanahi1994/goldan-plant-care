declare module 'moment-jalaali' {
  import moment from 'moment';
  
  interface LoadPersianOptions {
    usePersianDigits?: boolean;
    dialect?: 'persian-modern' | 'persian';
  }
  
  interface JalaaliMoment extends moment.Moment {
    jYear(): number;
    jMonth(): number;
    jDate(): number;
    jDayOfYear(): number;
    jWeek(): number;
    jWeekYear(): number;
    startOf(unit: moment.unitOfTime.StartOf | 'jYear' | 'jMonth' | 'jWeek'): JalaaliMoment;
    endOf(unit: moment.unitOfTime.StartOf | 'jYear' | 'jMonth' | 'jWeek'): JalaaliMoment;
    add(amount: number, unit: moment.unitOfTime.DurationConstructor | 'jYear' | 'jMonth' | 'jDay'): JalaaliMoment;
    subtract(amount: number, unit: moment.unitOfTime.DurationConstructor | 'jYear' | 'jMonth' | 'jDay'): JalaaliMoment;
  }

  interface JalaaliStatic {
    (): JalaaliMoment;
    (date?: moment.MomentInput): JalaaliMoment;
    (date?: moment.MomentInput, format?: moment.MomentFormatSpecification, strict?: boolean): JalaaliMoment;
    (date?: moment.MomentInput, format?: moment.MomentFormatSpecification, language?: string, strict?: boolean): JalaaliMoment;
    loadPersian(options?: LoadPersianOptions): void;
    jIsLeapYear(year: number): boolean;
    jDaysInMonth(year: number, month: number): number;
  }

  const momentJalaali: JalaaliStatic & typeof moment;
  export = momentJalaali;
}
