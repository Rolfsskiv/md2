import {
  AfterContentInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Optional,
  Output,
  Renderer,
  ViewEncapsulation,
  ViewChild,
  NgModule,
  ModuleWithProviders
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ENTER, SPACE } from '../core/keyboard/keycodes';
import { ListKeyManager } from '../core/a11y/list-key-manager';
import { Dir } from '../core/rtl/dir';
import { transformPlaceholder, transformPanel, fadeInContent } from './datepicker-animations';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { coerceBooleanProperty } from '../core/coercion/boolean-property';
import { ConnectedOverlayDirective } from '../core/overlay/overlay-directives';
import { ViewportRuler } from '../core/overlay/position/viewport-ruler';
import {
  OVERLAY_PROVIDERS,
  OverlayModule,
} from '../core';
import { Md2DateUtil } from './dateUtil';

export const DATEPICKER_WEEK_DAYS = ['s', 'm', 't', 'w', 't', 'f', 's'];

/** Change event object emitted by Md2Datepicker. */
export class Md2DatepickerChange {
  source: Md2Datepicker;
  value: Date;
}

@Component({
  moduleId: module.id,
  selector: 'md2-datepicker',
  templateUrl: 'datepicker.html',
  styleUrls: ['datepicker.css'],
  encapsulation: ViewEncapsulation.None,
  host: {
    'role': 'listbox',
    '[attr.tabindex]': '_getTabIndex()',
    '[attr.aria-label]': 'placeholder',
    '[attr.aria-required]': 'required.toString()',
    '[attr.aria-disabled]': 'disabled.toString()',
    '[attr.aria-invalid]': '_control?.invalid || "false"',
    '[attr.aria-owns]': '_optionIds',
    '[class.md2-datepicker-disabled]': 'disabled',
    '(keydown)': '_handleKeydown($event)',
    '(blur)': '_onBlur()'
  },
  animations: [
    transformPlaceholder,
    transformPanel,
    fadeInContent
  ],
  exportAs: 'md2Datepicker',
})
export class Md2Datepicker implements AfterContentInit, ControlValueAccessor, OnDestroy {
  /** Whether or not the overlay panel is open. */
  private _panelOpen = false;

  /** The currently selected option. */
  private _value: Date = null;

  private _viewDate: Date = new Date();

  /** Whether filling out the datepicker is required in the form.  */
  private _required: boolean = false;

  /** Whether the datepicker is disabled.  */
  private _disabled: boolean = false;

  private _min: Date;
  private _max: Date;

  private _format: string = this.type === 'date' ?
    'd/m/y' : this.type === 'time' ? 'HH:mm' : this.type === 'datetime' ?
      'd/m/y HH:mm' : 'd/m/y';

  /** The placeholder displayed in the trigger of the datepicker. */
  private _placeholder: string;

  /** The animation state of the placeholder. */
  _placeholderState = '';

  /**
   * The width of the selected option's value. Must be set programmatically
   * to ensure its overflow is clipped, as it's absolutely positioned.
   */
  _selectedValueWidth: number;

  _weekDays: Array<string> = DATEPICKER_WEEK_DAYS;

  /** View -> model callback called when value changes */
  _onChange = (value: any) => { };

  /** View -> model callback called when datepicker has been touched */
  _onTouched = () => { };

  /** The IDs of child options to be passed to the aria-owns attribute. */
  _optionIds: string = '';

  /** The value of the datepicker panel's transform-origin property. */
  _transformOrigin: string = 'top';

  @ViewChild('trigger') trigger: ElementRef;
  @ViewChild(ConnectedOverlayDirective) overlayDir: ConnectedOverlayDirective;

  @Output() change: EventEmitter<Md2DatepickerChange> = new EventEmitter<Md2DatepickerChange>();

  @Input()
  get placeholder() { return this._placeholder; }
  set placeholder(value: string) { this._placeholder = value; }

  @Input()
  get format() { return this._format; }
  set format(value: string) { this._format = value; }

  @Input()
  get disabled() { return this._disabled; }
  set disabled(value: any) { this._disabled = coerceBooleanProperty(value); }

  @Input() type: 'date' | 'time' | 'datetime' = 'date';

  @Input()
  get required() { return this._required; }
  set required(value: any) { this._required = coerceBooleanProperty(value); }

  @Input()
  get min() { return this._min; }
  set min(value: Date) { this._min = value; }

  @Input()
  get max() { return this._max; }
  set max(value: Date) { this._max = value; }

  @Input()
  get value(): any { return this._value; }
  set value(value: any) {
    if (this._value !== value) {
      this._value = value;
      //if (this._dateUtil.isValidDate(value)) {
      //  this._value = value;
      //} else {
      //  if (this.type === 'time') {
      //    this._value = new Date('1-1-1 ' + value);
      //  } else {
      //    this._value = new Date(value);
      //  }
      //}
      //this._viewDate = this._formatDate(this._value);
      //let date = '';
      //if (this.type !== 'time') {
      //  date += this._value.getFullYear() + '-' + (this._value.getMonth() + 1) +
      //    '-' + this._value.getDate();
      //}
      //if (this.type === 'datetime') {
      //  date += ' ';
      //}
      //if (this.type !== 'date') {
      //  date += this._value.getHours() + ':' + this._value.getMinutes();
      //}
      //if (this._isInitialized) {
      //  if (this._control) {
      //    this._onChange(date);
      //  }
      //  this.change.emit(date);
      //}
    }
  }

  get viewDate(): any { return this._viewDate; }
  set viewDate(value: any) {
    if (this._viewDate !== value) {
      this._viewDate = value;
    }
    this.generateCalendar();
    this._resetClock();
  }


  @Output() onOpen = new EventEmitter();
  @Output() onClose = new EventEmitter();

  constructor(private _dateUtil: Md2DateUtil, private _element: ElementRef,
    private _renderer: Renderer, private _viewportRuler: ViewportRuler,
    @Optional() private _dir: Dir, @Optional() public _control: NgControl) {
    if (this._control) {
      this._control.valueAccessor = this;
    }
    this.getYears();
    this.generateClock();
    // this.mouseMoveListener = (event: MouseEvent) => { this.onMouseMoveClock(event); };
    // this.mouseUpListener = (event: MouseEvent) => { this.onMouseUpClock(event); };
  }

  ngAfterContentInit() {
  }

  ngOnDestroy() {
  }

  /** Toggles the overlay panel open or closed. */
  toggle(): void {
    this.panelOpen ? this.close() : this.open();
  }

  /** Opens the overlay panel. */
  open(): void {
    if (this.disabled) {
      return;
    }
    this._placeholderState = this._isRtl() ? 'floating-rtl' : 'floating-ltr';
    this._panelOpen = true;
    this.viewDate = this.value || this.today;
  }

  /** Closes the overlay panel and focuses the host element. */
  close(): void {
    this._panelOpen = false;
    if (!this._value) {
      this._placeholderState = '';
    }
    this._isYearsVisible = false;
    this._isCalendarVisible = this.type !== 'time' ? true : false;
    this._isHoursVisible = true;
    this._focusHost();
  }

  /** Dispatch change event with current datepicker and value. */
  _emitChangeEvent(): void {
    let event = new Md2DatepickerChange();
    event.source = this;
    event.value = this._value;
    this._onChange(event.value);
    this.change.emit(event);
  }

  /**
   * Sets the datepicker's value. Part of the ControlValueAccessor interface
   * required to integrate with Angular's core forms API.
   */
  writeValue(value: any): void {
    if (this._value !== value) {
      this._value = value;
    }
  }

  /**
   * Saves a callback function to be invoked when the datepicker's value
   * changes from user input. Part of the ControlValueAccessor interface
   * required to integrate with Angular's core forms API.
   */
  registerOnChange(fn: (value: any) => void): void { this._onChange = fn; }

  /**
   * Saves a callback function to be invoked when the datepicker is blurred
   * by the user. Part of the ControlValueAccessor interface required
   * to integrate with Angular's core forms API.
   */
  registerOnTouched(fn: () => {}): void { this._onTouched = fn; }

  /**
   * Disables the datepicker. Part of the ControlValueAccessor interface required
   * to integrate with Angular's core forms API.
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /** Whether or not the overlay panel is open. */
  get panelOpen(): boolean {
    return this._panelOpen;
  }

  _isRtl(): boolean {
    return this._dir ? this._dir.value === 'rtl' : false;
  }

  /** The width of the trigger element. This is necessary to match
   * the overlay width to the trigger width.
   */
  _getWidth(): number {
    return this._getTriggerRect().width;
  }

  /** Ensures the panel opens if activated by the keyboard. */
  _handleKeydown(event: KeyboardEvent): void {
    if (event.keyCode === ENTER || event.keyCode === SPACE) {
      this.open();
    }
  }

  _handleOnKeydown(event: KeyboardEvent) {

  }

  /**
   * When the panel is finished animating, emits an event and focuses
   * an option if the panel is open.
   */
  _onPanelDone(): void {
    if (this.panelOpen) {
      this.onOpen.emit();
    } else {
      this.onClose.emit();
    }
  }

  /**
   * Calls the touched callback only if the panel is closed. Otherwise, the trigger will
   * "blur" to the panel when it opens, causing a false positive.
   */
  _onBlur() {
    if (!this.panelOpen) {
      this._onTouched();
    }
  }

  /** Returns the correct tabindex for the datepicker depending on disabled state. */
  _getTabIndex() {
    return this.disabled ? '-1' : '0';
  }



  private _getTriggerRect(): ClientRect {
    return this.trigger.nativeElement.getBoundingClientRect();
  }

  /** Focuses the host element when the panel closes. */
  private _focusHost(): void {
    this._renderer.invokeElementMethod(this._element.nativeElement, 'focus');
  }

  //==================================================================================================================================================


  //ngAfterContentInit() {
  //  this._isCalendarVisible = this.type !== 'time' ? true : false;
  //}

  // private mouseMoveListener: any;
  // private mouseUpListener: any;

  _isYearsVisible: boolean;
  _isCalendarVisible: boolean;
  _isHoursVisible: boolean = true;


  _hours: Array<Object> = [];
  _minutes: Array<Object> = [];

  _prevMonth: number = 1;
  _currMonth: number = 2;
  _nextMonth: number = 3;

  _years: Array<number> = [];
  _dates: Array<Object> = [];
  private today: Date = new Date();

  _clock: any = {
    dialRadius: 120,
    outerRadius: 99,
    innerRadius: 66,
    tickRadius: 17,
    hand: { x: 0, y: 0 },
    x: 0, y: 0,
    dx: 0, dy: 0,
    moved: false
  };

  private _minDate: Date = null;
  private _maxDate: Date = null;

  @Input() name: string = '';
  //@Input() id: string = 'md2-datepicker-' + (++nextId);
  //@Input() format: string = this.type === 'date' ?
  //  'DD/MM/YYYY' : this.type === 'time' ? 'HH:mm' : this.type === 'datetime' ?
  //    'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';
  //@Input() tabindex: number = 0;


  //@HostListener('keydown', ['$event'])
  //_handleKeydown(event: KeyboardEvent) {
  //  if (this.disabled) { return; }

  //  if (this._panelOpen) {
  //    event.preventDefault();
  //    event.stopPropagation();

  //    switch (event.keyCode) {
  //      case TAB:
  //      case ESCAPE: this.close(); break;
  //    }
  //    let displayDate = this.displayDate;
  //    if (this._isYearsVisible) {
  //      switch (event.keyCode) {
  //        case ENTER:
  //        case SPACE: this._onClickOk(); break;

  //        case DOWN_ARROW:
  //          if (this.displayDate.getFullYear() < (this.today.getFullYear() + 100)) {
  //            this.displayDate = this._dateUtil.incrementYears(displayDate, 1);
  //            this._scrollToSelectedYear();
  //          }
  //          break;
  //        case UP_ARROW:
  //          if (this.displayDate.getFullYear() > 1900) {
  //            this.displayDate = this._dateUtil.incrementYears(displayDate, -1);
  //            this._scrollToSelectedYear();
  //          }
  //          break;
  //      }

  //    } else if (this._isCalendarVisible) {
  //      switch (event.keyCode) {
  //        case ENTER:
  //        case SPACE: this.setDate(this.displayDate); break;

  //        case RIGHT_ARROW:
  //          this.displayDate = this._dateUtil.incrementDays(displayDate, 1);
  //          break;
  //        case LEFT_ARROW:
  //          this.displayDate = this._dateUtil.incrementDays(displayDate, -1);
  //          break;

  //        case PAGE_DOWN:
  //          this.displayDate = this._dateUtil.incrementMonths(displayDate, 1);
  //          break;
  //        case PAGE_UP:
  //          this.displayDate = this._dateUtil.incrementMonths(displayDate, -1);
  //          break;

  //        case DOWN_ARROW:
  //          this.displayDate = this._dateUtil.incrementDays(displayDate, 7);
  //          break;
  //        case UP_ARROW:
  //          this.displayDate = this._dateUtil.incrementDays(displayDate, -7);
  //          break;

  //        case HOME:
  //          this.displayDate = this._dateUtil.getFirstDateOfMonth(displayDate);
  //          break;
  //        case END:
  //          this.displayDate = this._dateUtil.getLastDateOfMonth(displayDate);
  //          break;
  //      }
  //      if (!this._dateUtil.isSameMonthAndYear(displayDate, this.displayDate)) {
  //        this.generateCalendar();
  //      }
  //    } else if (this._isHoursVisible) {
  //      switch (event.keyCode) {
  //        case ENTER:
  //        case SPACE: this.setHour(this.displayDate.getHours()); break;

  //        case UP_ARROW:
  //          this.displayDate = this._dateUtil.incrementHours(displayDate, 1); this._resetClock();
  //          break;
  //        case DOWN_ARROW:
  //          this.displayDate = this._dateUtil.incrementHours(displayDate, -1); this._resetClock();
  //          break;
  //      }
  //    } else {
  //      switch (event.keyCode) {
  //        case ENTER:
  //        case SPACE:
  //          this.setMinute(this.displayDate.getMinutes());
  //          break;

  //        case UP_ARROW:
  //          this.displayDate = this._dateUtil.incrementMinutes(displayDate, 1); this._resetClock();
  //          break;
  //        case DOWN_ARROW:
  //          this.displayDate = this._dateUtil.incrementMinutes(displayDate, -1); this._resetClock();
  //          break;
  //      }
  //    }
  //  } else {
  //    switch (event.keyCode) {
  //      case ENTER:
  //      case SPACE:
  //        event.preventDefault();
  //        event.stopPropagation();
  //        this.open();
  //        break;
  //    }
  //  }
  //}

  /**
   * Display Years
   */
  _showYear() {
    this._isYearsVisible = true;
    this._isCalendarVisible = true;
    this._scrollToSelectedYear();
  }

  private getYears() {
    let startYear = this._minDate ? this._minDate.getFullYear() : 1900,
      endYear = this._maxDate ? this._maxDate.getFullYear() : this.today.getFullYear() + 100;
    this._years = [];
    for (let i = startYear; i <= endYear; i++) {
      this._years.push(i);
    }
  }

  private _scrollToSelectedYear() {
    setTimeout(() => {
      let yearContainer = this.overlayDir.overlayRef.overlayElement.querySelector('.md2-calendar-years'),
        selectedYear: any = this.overlayDir.overlayRef.overlayElement.querySelector('.md2-calendar-year.selected');
      yearContainer.scrollTop = (selectedYear.offsetTop + 20) - yearContainer.clientHeight / 2;
    }, 0);
  }

  /**
   * select year
   * @param year
   */
  _setYear(year: number) {
    let date = this._viewDate;
    this.viewDate = new Date(year, date.getMonth(), date.getDate(),
      date.getHours(), date.getMinutes());
    this.generateCalendar();
    this._isYearsVisible = false;
    //this._isCalendarVisible = true;
  }

  /**
   * Display Calendar
   */
  _showCalendar() {
    this._isYearsVisible = false;
    this._isCalendarVisible = true;
  }

  /**
   * Toggle Hour visiblity
   */
  _toggleHours(value: boolean) {
    this._isYearsVisible = false;
    this._isCalendarVisible = false;
    this._isYearsVisible = false;
    this._isHoursVisible = value;
    this._resetClock();
  }

  /**
   * Ok Button Event
   */
  _onClickOk() {
    if (this._isYearsVisible) {
      this.generateCalendar();
      this._isYearsVisible = false;
      this._isCalendarVisible = true;
    } else if (this._isCalendarVisible) {
      this.setDate(this._viewDate);
    } else if (this._isHoursVisible) {
      this._isHoursVisible = false;
      this._resetClock();
    } else {
      this.value = this._viewDate;
      this.close();
    }
  }

  /**
   * Date Selection Event
   * @param event Event Object
   * @param date Date Object
   */
  _onClickDate(event: Event, date: any) {
    event.preventDefault();
    event.stopPropagation();
    if (date.disabled) { return; }
    if (date.calMonth === this._prevMonth) {
      this._updateMonth(-1);
    } else if (date.calMonth === this._currMonth) {
      this._viewDate.setDate(date.dateObj.day);
      //this.setDate(new Date(date.dateObj.year, date.dateObj.month,
      //  date.dateObj.day, this.displayDate.getHours(), this.displayDate.getMinutes()));
    } else if (date.calMonth === this._nextMonth) {
      this._updateMonth(1);
    }
  }

  /**
   * Set Date
   * @param date Date Object
   */
  private setDate(date: Date) {
    if (this.type === 'date') {
      this.value = date;
      this.close();
    } else {
      this._viewDate = date;
      this._isCalendarVisible = false;
      this._isHoursVisible = true;
      this._resetClock();
    }
  }

  /**
   * Update Month
   * @param noOfMonths increment number of months
   */
  _updateMonth(noOfMonths: number) {
    this._viewDate = this._dateUtil.incrementMonths(this._viewDate, noOfMonths);
    this.generateCalendar();
  }

  /**
   * Check is Before month enabled or not
   * @return boolean
   */
  _isBeforeMonth() {
    return !this._minDate ? true :
      this._minDate && this._dateUtil.getMonthDistance(this._viewDate, this._minDate) < 0;
  }

  /**
   * Check is After month enabled or not
   * @return boolean
   */
  _isAfterMonth() {
    return !this._maxDate ? true :
      this._maxDate && this._dateUtil.getMonthDistance(this._viewDate, this._maxDate) > 0;
  }

  /**
   * Check the date is enabled or not
   * @param date Date Object
   * @return boolean
   */
  private _isDisabledDate(date: Date): boolean {
    if (this._minDate && this._maxDate) {
      return (this._minDate > date) || (this._maxDate < date);
    } else if (this._minDate) {
      return (this._minDate > date);
    } else if (this._maxDate) {
      return (this._maxDate < date);
    } else {
      return false;
    }

    // if (this.disableWeekends) {
    //   let dayNbr = this.getDayNumber(date);
    //   if (dayNbr === 0 || dayNbr === 6) {
    //     return true;
    //   }
    // }
    // return false;
  }

  /**
   * Generate Month Calendar
   */
  private generateCalendar(): void {
    let year = this._viewDate.getFullYear();
    let month = this._viewDate.getMonth();

    this._dates.length = 0;

    let firstDayOfMonth = this._dateUtil.getFirstDateOfMonth(this._viewDate);
    let numberOfDaysInMonth = this._dateUtil.getNumberOfDaysInMonth(this._viewDate);
    let numberOfDaysInPrevMonth = this._dateUtil.getNumberOfDaysInMonth(
      this._dateUtil.incrementMonths(this._viewDate, -1));

    let dayNbr = 1;
    let calMonth = this._prevMonth;

    let prevMonth = numberOfDaysInPrevMonth - firstDayOfMonth.getDay() + 1;
    for (let j = prevMonth; j <= numberOfDaysInPrevMonth; j++) {
      let iDate = { year: year, month: month - 1, day: j, hour: 0, minute: 0 };
      let date: Date = new Date(year, month - 1, j);
      this._dates.push({
        date: date,
        dateObj: iDate,
        calMonth: calMonth,
        today: this._dateUtil.isSameDay(this.today, date),
        disabled: this._isDisabledDate(date)
      });
    }

    calMonth = this._currMonth;
    for (let j = 0; j < numberOfDaysInMonth; j++) {
      let iDate = { year: year, month: month, day: dayNbr, hour: 0, minute: 0 };
      let date: Date = new Date(year, month, dayNbr);
      this._dates.push({
        date: date,
        dateObj: iDate,
        calMonth: calMonth,
        today: this._dateUtil.isSameDay(this.today, date),
        disabled: this._isDisabledDate(date)
      });
      dayNbr++;
    }



    //for (let j = 1; j < 8; j++) {
    //  if (dayNbr > numberOfDaysInMonth) {
    //    dayNbr = 1;
    //    calMonth = this._nextMonth;
    //  }
    //  let iDate = {
    //    year: year,
    //    month: calMonth === this._currMonth ? month : month + 1,
    //    day: dayNbr, hour: 0, minute: 0
    //  };
    //  let date: Date = new Date(year, iDate.month, dayNbr);
    //  week.push({
    //    date: date,
    //    dateObj: iDate,
    //    calMonth: calMonth,
    //    today: this._dateUtil.isSameDay(this.today, date),
    //    disabled: this._isDisabledDate(date)
    //  });
    //  dayNbr++;
    //}



    //for (let i = 1; i < 7; i++) {
    //  let week: Array<any> = [];
    //  if (i === 1) {

    //  } else {

    //  }
    //  this._dates.push(week);
    //}
  }

  //_buildCalendarForMonth(date: Date) {
  //  date = this._dateUtil.isValidDate(date) ? date : new Date();

  //  let firstDayOfMonth = this._dateUtil.getFirstDateOfMonth(date);
  //  let firstDayOfTheWeek = this._getLocaleDay_(firstDayOfMonth);
  //  let numberOfDaysInMonth = this._dateUtil.getNumberOfDaysInMonth(date);
  //  var monthBody = document.createDocumentFragment();

  //  var rowNumber = 1;
  //  var row = this.buildDateRow(rowNumber);
  //  monthBody.appendChild(row);

  //  // If this is the final month in the list of items, only the first week should render,
  //  // so we should return immediately after the first row is complete and has been
  //  // attached to the body.
  //  var isFinalMonth = this.offset === this.monthCtrl.items.length - 1;

  //  // Add a label for the month. If the month starts on a Sun/Mon/Tues, the month label
  //  // goes on a row above the first of the month. Otherwise, the month label takes up the first
  //  // two cells of the first row.
  //  var blankCellOffset = 0;
  //  var monthLabelCell = document.createElement('td');
  //  var monthLabelCellContent = document.createElement('span');

  //  monthLabelCellContent.textContent = this.dateLocale.monthHeaderFormatter(date);
  //  monthLabelCell.appendChild(monthLabelCellContent);
  //  monthLabelCell.classList.add('md-calendar-month-label');
  //  // If the entire month is after the max date, render the label as a disabled state.
  //  if (this.calendarCtrl.maxDate && firstDayOfMonth > this.calendarCtrl.maxDate) {
  //    monthLabelCell.classList.add('md-calendar-month-label-disabled');
  //  } else {
  //    monthLabelCell.addEventListener('click', this.monthCtrl.headerClickHandler);
  //    monthLabelCell.setAttribute('data-timestamp', firstDayOfMonth.getTime());
  //    monthLabelCell.setAttribute('aria-label', this.dateLocale.monthFormatter(date));
  //    monthLabelCell.appendChild(this.arrowIcon.cloneNode(true));
  //  }

  //  if (firstDayOfTheWeek <= 2) {
  //    monthLabelCell.setAttribute('colspan', '7');

  //    var monthLabelRow = this.buildDateRow();
  //    monthLabelRow.appendChild(monthLabelCell);
  //    monthBody.insertBefore(monthLabelRow, row);

  //    if (isFinalMonth) {
  //      return monthBody;
  //    }
  //  } else {
  //    blankCellOffset = 3;
  //    monthLabelCell.setAttribute('colspan', '3');
  //    row.appendChild(monthLabelCell);
  //  }

  //  // Add a blank cell for each day of the week that occurs before the first of the month.
  //  // For example, if the first day of the month is a Tuesday, add blank cells for Sun and Mon.
  //  // The blankCellOffset is needed in cases where the first N cells are used by the month label.
  //  for (var i = blankCellOffset; i < firstDayOfTheWeek; i++) {
  //    row.appendChild(this.buildDateCell());
  //  }

  //  // Add a cell for each day of the month, keeping track of the day of the week so that
  //  // we know when to start a new row.
  //  var dayOfWeek = firstDayOfTheWeek;
  //  var iterationDate = firstDayOfMonth;
  //  for (var d = 1; d <= numberOfDaysInMonth; d++) {
  //    // If we've reached the end of the week, start a new row.
  //    if (dayOfWeek === 7) {
  //      // We've finished the first row, so we're done if this is the final month.
  //      if (isFinalMonth) {
  //        return monthBody;
  //      }
  //      dayOfWeek = 0;
  //      rowNumber++;
  //      row = this.buildDateRow(rowNumber);
  //      monthBody.appendChild(row);
  //    }

  //    iterationDate.setDate(d);
  //    var cell = this.buildDateCell(iterationDate);
  //    row.appendChild(cell);

  //    dayOfWeek++;
  //  }

  //  // Ensure that the last row of the month has 7 cells.
  //  while (row.childNodes.length < 7) {
  //    row.appendChild(this.buildDateCell());
  //  }

  //  // Ensure that all months have 6 rows. This is necessary for now because the virtual-repeat
  //  // requires that all items have exactly the same height.
  //  while (monthBody.childNodes.length < 6) {
  //    var whitespaceRow = this.buildDateRow();
  //    for (var j = 0; j < 7; j++) {
  //      whitespaceRow.appendChild(this.buildDateCell());
  //    }
  //    monthBody.appendChild(whitespaceRow);
  //  }

  //  return monthBody;
  //}

  /**
   * Select Hour
   * @param event Event Object
   * @param hour number of hours
   */
  _onClickHour(event: Event, hour: number) {
    event.preventDefault();
    event.stopPropagation();
    this.setHour(hour);
  }

  /**
   * Select Minute
   * @param event Event Object
   * @param minute number of minutes
   */
  _onClickMinute(event: Event, minute: number) {
    event.preventDefault();
    event.stopPropagation();
    this.setMinute(minute);
  }

  /**
   * Set hours
   * @param hour number of hours
   */
  private setHour(hour: number) {
    let date = this._viewDate;
    this._isHoursVisible = false;
    this._viewDate = new Date(date.getFullYear(), date.getMonth(),
      date.getDate(), hour, date.getMinutes());
    this._resetClock();
  }

  /**
   * Set minutes
   * @param minute number of minutes
   */
  private setMinute(minute: number) {
    let date = this._viewDate;
    this._viewDate = new Date(date.getFullYear(), date.getMonth(),
      date.getDate(), date.getHours(), minute);
    this.value = this._viewDate;
    this.close();
  }

  /**
   * reser clock hands
   */
  private _resetClock() {
    let hour = this._viewDate.getHours();
    let minute = this._viewDate.getMinutes();

    let value = this._isHoursVisible ? hour : minute,
      unit = Math.PI / (this._isHoursVisible ? 6 : 30),
      radian = value * unit,
      radius = this._isHoursVisible && value > 0 && value < 13 ?
        this._clock.innerRadius : this._clock.outerRadius,
      x = Math.sin(radian) * radius,
      y = - Math.cos(radian) * radius;
    this._setClockHand(x, y);
  }

  /**
   * set clock hand
   * @param x number of x position
   * @param y number of y position
   */
  private _setClockHand(x: number, y: number) {
    let radian = Math.atan2(x, y),
      unit = Math.PI / (this._isHoursVisible ? 6 : 30),
      z = Math.sqrt(x * x + y * y),
      inner = this._isHoursVisible && z < (this._clock.outerRadius + this._clock.innerRadius) / 2,
      radius = inner ? this._clock.innerRadius : this._clock.outerRadius,
      value = 0;

    if (radian < 0) { radian = Math.PI * 2 + radian; }
    value = Math.round(radian / unit);
    radian = value * unit;
    if (this._isHoursVisible) {
      if (value === 12) { value = 0; }
      value = inner ? (value === 0 ? 12 : value) : value === 0 ? 0 : value + 12;
    } else {
      if (value === 60) { value = 0; }
    }

    this._clock.hand = {
      x: Math.sin(radian) * radius,
      y: Math.cos(radian) * radius
    };
  }

  /**
   * render Click
   */
  private generateClock() {
    this._hours.length = 0;

    for (let i = 0; i < 24; i++) {
      let radian = i / 6 * Math.PI;
      let inner = i > 0 && i < 13,
        radius = inner ? this._clock.innerRadius : this._clock.outerRadius;
      this._hours.push({
        hour: i === 0 ? '00' : i,
        top: this._clock.dialRadius - Math.cos(radian) * radius - this._clock.tickRadius,
        left: this._clock.dialRadius + Math.sin(radian) * radius - this._clock.tickRadius
      });
    }

    for (let i = 0; i < 60; i += 5) {
      let radian = i / 30 * Math.PI;
      this._minutes.push({
        minute: i === 0 ? '00' : i,
        top: this._clock.dialRadius - Math.cos(radian) * this._clock.outerRadius -
        this._clock.tickRadius,
        left: this._clock.dialRadius + Math.sin(radian) * this._clock.outerRadius -
        this._clock.tickRadius
      });
    }
  }

  /**
   * Prepend Zero
   * @param value String value
   * @return string with prepend Zero
   */
  private _prependZero(value: string): string {
    return parseInt(value) < 10 ? '0' + value : value;
  }

  /**
   * Get Offset
   * @param element HtmlElement
   * @return top, left offset from page
   */
  private _offset(element: any) {
    let top = 0, left = 0;
    do {
      top += element.offsetTop || 0;
      left += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);

    return {
      top: top,
      left: left
    };
  }
}

@NgModule({
  imports: [CommonModule, OverlayModule],
  exports: [Md2Datepicker],
  declarations: [Md2Datepicker],
})
export class Md2DatepickerModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: Md2DatepickerModule,
      providers: [OVERLAY_PROVIDERS, Md2DateUtil]
    };
  }
}
