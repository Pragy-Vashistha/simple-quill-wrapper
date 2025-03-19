import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import Quill from 'quill';
import Delta from 'quill-delta';

// Define types for Quill operations
interface QuillOperation {
  insert?: string | Record<string, unknown>;
  delete?: number;
  retain?: number;
  attributes?: {
    color?: string;
    [key: string]: unknown;
  };
}

type QuillDelta = Delta & { ops: QuillOperation[] };

@Component({
  selector: 'app-quill-editor',
  templateUrl: './quill-editor.component.html',
  styleUrls: ['./quill-editor.component.scss'],
  standalone: true
})
export class QuillEditorComponent implements AfterViewInit {
  @ViewChild('editor') editorElement!: ElementRef;
  quill: Quill | undefined;
  private lastKnownRange: { index: number; length: number } | null = null;
  private isEditorFocused = false;

  ngAfterViewInit() {
    this.initializeQuill();
    this.setupEventListeners();
  }

  private initializeQuill() {
    this.quill = new Quill(this.editorElement.nativeElement, {
      modules: {
        toolbar: {
          container: '#toolbar',
          handlers: {
            'operator-minus': () => this.insertOperator('-'),
            'operator-plus': () => this.insertOperator('+'),
            'operator-divide': () => this.insertOperator('/'),
            'function-avg': () => this.insertFunction('Avg'),
            'function-sum': () => this.insertFunction('Sum'),
            'function-scale': () => this.insertFunction('Scale')
          }
        },
        keyboard: {
          bindings: {
            alpha: {
              key: /[a-zA-Z]/,
              handler: () => false // Block all alphabetic input
            }
          }
        }
      },
      theme: 'snow',
      placeholder: 'Build your expression here...'
    });

    // Set initial focus without scrolling
    this.quill.focus({ preventScroll: true });
  }

  private setupEventListeners() {
    if (!this.quill) return;

    // Track selection changes and editor focus
    this.quill.on('selection-change', (range, oldRange, source) => {
      console.log('Selection changed:', { range, oldRange, source });
      
      // Update focus state
      this.isEditorFocused = range !== null;
      
      if (range) {
        // Store selection when editor has focus
        this.lastKnownRange = range;
        console.log('Selection updated:', range);
      } else if (oldRange) {
        // Editor lost focus, but keep last range
        console.log('Editor lost focus, last range:', this.lastKnownRange);
      }
    });

    // Handle text changes for sanitization
    this.quill.on('text-change', (_delta: Delta, _oldContents: Delta, source: string) => {
      if (source !== 'user') return;

      const contents = this.quill!.getContents() as QuillDelta;
      let changed = false;
      
      const newOps = (contents.ops || []).map((op) => {
        const operation = op as QuillOperation;
        if (operation.insert && typeof operation.insert === 'string') {
          const isProgrammatic = 
            operation.attributes?.['color'] === 'red' || // Properties are red
            (operation.attributes?.['color'] === 'black' && // Operators and functions are black
             /^(\s*[+\-\/]|\s+|\s*[A-Z][a-z]+\s*\(|\s*\)|\s*,\s*)$/.test(operation.insert));

          if (!isProgrammatic) {
            const filtered = operation.insert.replace(/[a-zA-Z]+/g, '');
            if (filtered !== operation.insert) {
              changed = true;
              return { ...operation, insert: filtered };
            }
          }
        }
        return operation;
      }).filter((op) => (op as QuillOperation).insert !== '');

      if (changed) {
        // Store current selection before content change
        const selection = this.quill!.getSelection(true);
        this.quill!.setContents(new Delta(newOps as any[]), 'api');
        
        if (selection) {
          // Restore selection after content change
          const newIndex = Math.min(selection.index, this.quill!.getLength() - 1);
          this.quill!.setSelection(newIndex, 0, 'api');
          this.lastKnownRange = { index: newIndex, length: 0 };
        }
      }
    });
  }

  insertProperty(property: string) {
    if (!this.quill) return;

    // Focus editor and get selection
    if (!this.isEditorFocused) {
      this.quill.focus();
    }

    // Force get selection with focus
    const range = this.quill.getSelection(true) || this.lastKnownRange || { index: 0, length: 0 };
    const index = range.index;

    console.log('Inserting property at index:', index);

    // Insert property with formatting
    this.quill.insertText(index, property, { color: 'red' }, 'api');
    this.quill.insertText(index + property.length, ' ', { color: 'black' }, 'api');
    
    // Update selection and ensure it's visible
    const newPosition = index + property.length + 1;
    this.quill.setSelection(newPosition, 0, 'api');
    this.lastKnownRange = { index: newPosition, length: 0 };
    this.quill.scrollSelectionIntoView();
  }

  insertOperator(operator: string) {
    if (!this.quill) return;

    if (!this.isEditorFocused) {
      this.quill.focus();
    }

    const range = this.quill.getSelection(true) || this.lastKnownRange || { index: 0, length: 0 };
    const index = range.index;

    this.quill.insertText(index, ` ${operator} `, { color: 'black' }, 'api');
    
    const newPosition = index + operator.length + 2;
    this.quill.setSelection(newPosition, 0, 'api');
    this.lastKnownRange = { index: newPosition, length: 0 };
    this.quill.scrollSelectionIntoView();
  }

  insertFunction(func: string) {
    if (!this.quill) return;

    if (!this.isEditorFocused) {
      this.quill.focus();
    }

    const range = this.quill.getSelection(true) || this.lastKnownRange || { index: 0, length: 0 };
    
    if (range.length > 0) {
      // Handle selected text
      const contents = this.quill.getContents(range.index, range.length) as QuillDelta;
      const propertyOps = (contents.ops || [])
        .map(op => op as QuillOperation)
        .filter(op => op.attributes?.['color'] === 'red' && typeof op.insert === 'string');

      if (propertyOps && propertyOps.length > 0) {
        // Wrap selected properties in function
        this.quill.deleteText(range.index, range.length, 'api');
        let currentIndex = range.index;

        // Insert function name and opening parenthesis
        this.quill.insertText(currentIndex, `${func}(`, { color: 'black' }, 'api');
        currentIndex += func.length + 1;

        // Insert properties with commas
        propertyOps.forEach((op, idx) => {
          if (op.insert && typeof op.insert === 'string') {
            const text = op.insert.trim();
            this.quill!.insertText(currentIndex, text, { color: 'red' }, 'api');
            currentIndex += text.length;

            if (idx < propertyOps.length - 1) {
              this.quill!.insertText(currentIndex, ', ', { color: 'black' }, 'api');
              currentIndex += 2;
            }
          }
        });

        // Close function
        this.quill.insertText(currentIndex, ')', { color: 'black' }, 'api');
        
        const newPosition = currentIndex + 1;
        this.quill.setSelection(newPosition, 0, 'api');
        this.lastKnownRange = { index: newPosition, length: 0 };
        this.quill.scrollSelectionIntoView();
        return;
      }
    }

    // Insert empty function if no valid selection
    const index = range.index;
    this.quill.insertText(index, `${func}()`, { color: 'black' }, 'api');
    
    const newPosition = index + func.length + 1;
    this.quill.setSelection(newPosition, 0, 'api');
    this.lastKnownRange = { index: newPosition, length: 0 };
    this.quill.scrollSelectionIntoView();
  }

  // Get editor content
  getText(): string {
    return this.quill?.getText() || '';
  }

  getHTML(): string {
    return this.quill?.root.innerHTML || '';
  }

  // Focus management
  focus() {
    this.quill?.focus();
  }

  blur() {
    this.quill?.blur();
  }

  hasFocus(): boolean {
    return this.isEditorFocused;
  }
}
