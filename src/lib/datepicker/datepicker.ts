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
  private _value: Date;

  /** Whether filling out the datepicker is required in the form.  */
  private _required: boolean = false;

  /** Whether the datepicker is disabled.  */
  private _disabled: boolean = false;

  /** Whether the datepicker is type.  */
  private _type: string = 'date';

  private _min: Date;
  private _max: Date;

  private _format: string = '';

  /** The placeholder displayed in the trigger of the datepicker. */
  private _placeholder: string;

  /** The animation state of the placeholder. */
  _placeholderState = '';

  /**
   * The width of the selected option's value. Must be set programmatically
   * to ensure its overflow is clipped, as it's absolutely positioned.
   */
  _selectedValueWidth: number;

  /** Manages keyboard events for options in the panel. */
  _keyManager: ListKeyManager;

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

  @Input()
  get type() { return this._type; }
  set type(value: string) { this._type = value; }

  @Input()
  get required() { return this._required; }
  set required(value: any) { this._required = coerceBooleanProperty(value); }

  @Input()
  get min() { return this._min; }
  set min(value: Date) { this._min = value; }

  @Input()
  get max() { return this._max; }
  set max(value: Date) { this._max = value; }

  @Output() onOpen = new EventEmitter();
  @Output() onClose = new EventEmitter();

  constructor(private _element: ElementRef, private _renderer: Renderer,
    private _viewportRuler: ViewportRuler, @Optional() private _dir: Dir,
    @Optional() public _control: NgControl) {
    if (this._control) {
      this._control.valueAccessor = this;
    }
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
  }

  /** Closes the overlay panel and focuses the host element. */
  close(): void {
    this._panelOpen = false;
    if (!this._value) {
      this._placeholderState = '';
    }
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
      providers: [OVERLAY_PROVIDERS]
    };
  }
}
