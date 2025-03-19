/**
 * This component implements a Quill-based expression editor that allows users to:
 * 1. Insert predefined properties (displayed in red)
 * 2. Use mathematical operators (+, -, /)
 * 3. Apply functions (Avg, Sum, Scale) to properties
 * 4. Prevents direct typing of alphabetic characters while preserving programmatic text
 */

import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { QuillModule } from 'ngx-quill';

/**
 * Interface representing Quill's Delta operations
 * Used for type safety when handling editor content changes
 */
interface DeltaOperation {
  insert?: string | object;    // The text or object to insert
  delete?: number;            // Number of characters to delete
  retain?: number;            // Number of characters to retain
  attributes?: Record<string, any>; // Formatting attributes (color, etc.)
}

@Component({
  selector: 'app-quill-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    QuillModule
  ],
  templateUrl: './quill-editor.component.html',
  styleUrls: ['./quill-editor.component.scss']
})
export class QuillEditorComponent implements AfterViewInit {
  // List of available properties that can be inserted into the editor
  properties: string[] = ['speed', 'temperature', 'pressure'];
  
  // NgModel binding for editor content
  editorContent: string = '';
  
  // Currently selected property from the dropdown
  selectedProperty: string = '';
  
  // Reference to the Quill editor instance
  quillEditor: any;
  
  // Stores the last valid state of the editor
  lastGoodContents: any;

  // Reference to the property selector dropdown
  @ViewChild('propSelector') propSelector!: MatSelect;

  /**
   * Configuration for Quill editor modules
   * Includes custom toolbar handlers and keyboard bindings
   */
  quillModules = {
    toolbar: {
      container: '#toolbar',
      handlers: {
        // Custom handlers for operator buttons
        'operator-minus': () => this.insertOperator('-'),
        'operator-plus': () => this.insertOperator('+'),
        'operator-divide': () => this.insertOperator('/'),
        // Custom handlers for function buttons
        'function-avg': () => this.insertFunction('Avg'),
        'function-sum': () => this.insertFunction('Sum'),
        'function-scale': () => this.insertFunction('Scale')
      }
    },
    // Keyboard module to block direct typing of letters
    keyboard: {
      bindings: {
        'alpha': {
          key: null,
          handler: (range: any, context: any) => {
            const key = context.event.key;
            // Block alphabetic keys at keyboard level
            if (/[a-zA-Z]/.test(key)) {
              return false;
            }
            return true;    // Allow other characters
          }
        }
      }
    }
  };

  /**
   * Initialize property selector after view is ready
   * Uses setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
   */
  ngAfterViewInit() {
    setTimeout(() => {
      if (this.propSelector) {
        // Listen for property selection changes
        this.propSelector.openedChange.subscribe((isOpen: boolean) => {
          if (!isOpen && this.selectedProperty) {
            this.insertProperty(this.selectedProperty);
            this.selectedProperty = '';
          }
        });
      }
    }, 0);
  }

  /**
   * Called when Quill editor is created
   * Sets up text change listener to prevent alphabetic input
   * @param editor - The Quill editor instance
   */
  onEditorCreated(editor: any) {
    this.quillEditor = editor;
    
    // Log Quill version for debugging
    console.log('Quill version:', this.quillEditor.constructor.version);
    
    // Listen for text changes to sanitize user input
    this.quillEditor.on('text-change', (delta: any, oldContents: any, source: string) => {
      // Only process changes from user input
      if (source === 'user') {
        console.log('Text change detected (user)', delta);
        
        // Get current editor content with formatting
        const contents = this.quillEditor.getContents();
        console.log('Current contents:', JSON.stringify(contents));
        
        // Process operations to filter out unwanted alphabetic characters
        let changed = false;
        const newOps = contents.ops.map((op: DeltaOperation) => {
          // Handle text operations
          if (op.insert && typeof op.insert === 'string') {
            // Determine if this is programmatic text by checking:
            // 1. Red color (properties)
            // 2. Black color + specific patterns (functions, operators)
            const isProgrammatic = op.attributes?.['color'] === 'red' || 
                                   (op.attributes?.['color'] === 'black' && 
                                    /^(\s*[+\-\/]|\s+|\s*[A-Z][a-z]+\s*\(|\s*\)|\s*,\s*)$/.test(op.insert));
            
            // Remove alphabetic characters from non-programmatic text
            if (!isProgrammatic) {
              const filtered = op.insert.replace(/[a-zA-Z]+/g, '');
              if (filtered !== op.insert) {
                changed = true;
                return { ...op, insert: filtered };
              }
            }
          }
          return op;
        }).filter((op: DeltaOperation) => !(op.insert === '')); // Remove empty operations
        
        // Update editor content if changes were made
        if (changed) {
          console.log('Sanitized ops:', JSON.stringify(newOps));
          
          // Save current selection
          const selection = this.quillEditor.getSelection();
          
          // Update content while preserving formatting
          this.quillEditor.setContents({ ops: newOps }, 'api');
          
          // Restore cursor position
          if (selection) {
            let newIndex = selection.index;
            if (newIndex > this.quillEditor.getLength() - 1) {
              newIndex = this.quillEditor.getLength() - 1;
            }
            this.quillEditor.setSelection(newIndex, 0, 'api');
          }
        }
      }
    });
  }

  /**
   * Inserts a property into the editor with red color
   * @param property - The property name to insert
   */
  insertProperty(property: string) {
    if (!this.quillEditor) return;
    const range = this.quillEditor.getSelection(true);
    const index = range ? range.index : this.quillEditor.getLength();

    console.log(`Inserting property: ${property} at index ${index}`);
    
    // Format and insert property text in red
    this.quillEditor.formatText(index, property.length, 'color', 'red', 'api');
    this.quillEditor.insertText(index, property, { color: 'red' }, 'api');
    
    // Add space after property
    this.quillEditor.insertText(index + property.length, ' ', { color: 'black' }, 'api');
    
    // Move cursor after inserted text
    this.quillEditor.setSelection(index + property.length + 1, 0, 'api');
  }

  /**
   * Inserts an operator (+, -, /) into the editor
   * @param operator - The operator to insert
   */
  insertOperator(operator: string) {
    if (!this.quillEditor) return;
    const range = this.quillEditor.getSelection(true);
    const index = range ? range.index : this.quillEditor.getLength();
    
    console.log(`Inserting operator: ${operator} at index ${index}`);
    
    // Insert operator with surrounding spaces
    this.quillEditor.insertText(index, ` ${operator} `, { color: 'black' }, 'api');
    
    // Move cursor after operator
    this.quillEditor.setSelection(index + operator.length + 2, 0, 'api');
  }

  /**
   * Inserts a function (Avg, Sum, Scale) into the editor
   * If text is selected and contains properties, wraps them in the function
   * @param func - The function name to insert
   */
  insertFunction(func: string) {
    if (!this.quillEditor) return;
    const range = this.quillEditor.getSelection(true);
    if (!range) return;

    console.log(`Inserting function: ${func} at index ${range.index}`);

    if (range.length > 0) {
      // Get selected content
      const contents = this.quillEditor.getContents(range.index, range.length);
      // Find properties (red text) in selection
      const propertyOps = contents.ops?.filter((op: DeltaOperation) =>
        op.attributes?.['color'] === 'red' && typeof op.insert === 'string' && op.insert?.trim()
      );

      if (propertyOps && propertyOps.length > 0) {
        // Remove selected text
        this.quillEditor.deleteText(range.index, range.length, 'api');

        let currentIndex = range.index;
        // Insert function name and opening parenthesis
        this.quillEditor.insertText(currentIndex, `${func}(`, { color: 'black' }, 'api');
        currentIndex += func.length + 1;

        // Insert each property with commas
        propertyOps.forEach((op: DeltaOperation, idx: number) => {
          if (typeof op.insert === 'string') {
            const text = op.insert.trim();
            // Insert property in red
            this.quillEditor.insertText(currentIndex, text, { color: 'red' }, 'api');
            currentIndex += text.length;
            if (idx < propertyOps.length - 1) {
              // Add comma between properties
              this.quillEditor.insertText(currentIndex, ', ', { color: 'black' }, 'api');
              currentIndex += 2;
            }
          }
        });

        // Close function
        this.quillEditor.insertText(currentIndex, ')', { color: 'black' }, 'api');
        this.quillEditor.setSelection(currentIndex + 1, 0, 'api');
      } else {
        // Insert empty function if no properties selected
        this.quillEditor.insertText(range.index, `${func}()`, { color: 'black' }, 'api');
        this.quillEditor.setSelection(range.index + func.length + 1, 0, 'api');
      }
    } else {
      // Insert empty function if no selection
      this.quillEditor.insertText(range.index, `${func}()`, { color: 'black' }, 'api');
      this.quillEditor.setSelection(range.index + func.length + 1, 0, 'api');
    }
  }

  /**
   * Clears all content from the editor
   */
  clearEditor() {
    if (this.quillEditor) {
      this.quillEditor.setText('', 'api');
    }
    this.selectedProperty = '';
  }

  /**
   * Handles form submission
   * Logs both plain text and HTML content of the editor
   */
  onSubmit() {
    if (this.quillEditor) {
      const plainText = this.quillEditor.getText();
      const htmlContent = this.quillEditor.root.innerHTML;
      console.log('Expression:', plainText);
      console.log('HTML:', htmlContent);
    }
  }
}


<mat-card class="quill-editor-card">
  <mat-card-header>
    <mat-card-title>Quill Expression Editor</mat-card-title>
    <mat-card-subtitle>Build expressions with properties and toolbar functions</mat-card-subtitle>
  </mat-card-header>

  <mat-card-content>
    <form #myForm="ngForm" class="quill-editor-form" (ngSubmit)="onSubmit()">
      <!-- Property Selection -->
      <div class="property-selection-row">
        <mat-form-field appearance="outline" class="property-select">
          <mat-label>Select a Property</mat-label>
          <mat-select #propSelector name="propSelector" [(ngModel)]="selectedProperty">
            <mat-option *ngFor="let prop of properties" [value]="prop">
              {{ prop }}
            </mat-option>
          </mat-select>
          <mat-hint>Choose a property to insert</mat-hint>
        </mat-form-field>
      </div>

      <!-- Quill Editor Container -->
      <div class="quill-container">
        <label class="mat-label">Expression</label>
        
        <!-- Custom Toolbar - Must be outside quill-editor but before it -->
        <div id="toolbar">
          <span class="ql-formats">
            <button class="ql-operator-minus" type="button">-</button>
            <button class="ql-operator-plus" type="button">+</button>
            <button class="ql-operator-divide" type="button">/</button>
          </span>
          <span class="ql-formats">
            <button class="ql-function-avg" type="button">Avg</button>
            <button class="ql-function-sum" type="button">Sum</button>
            <button class="ql-function-scale" type="button">Scale</button>
          </span>
        </div>

        <!-- Quill Editor -->
        <quill-editor
          [(ngModel)]="editorContent"
          name="editor"
          [modules]="quillModules"
          (onEditorCreated)="onEditorCreated($event)"
          placeholder="Build your expression here">
        </quill-editor>
      </div>

      <!-- Action Buttons -->
      <div class="button-row">
        <button mat-stroked-button type="button" (click)="clearEditor()">
          Clear
        </button>
        <button mat-raised-button color="primary" type="submit">
          Submit
        </button>
      </div>
    </form>
  </mat-card-content>
</mat-card>

<!-- Display of the submission result -->
<mat-card *ngIf="editorContent" class="result-card">
  <mat-card-header>
    <mat-card-title>Current Content</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <div class="content-preview">
      <h3>HTML Content:</h3>
      <pre>{{ editorContent }}</pre>
      <h3>Plain Text:</h3>
      <pre>{{ quillEditor?.getText() }}</pre>
    </div>
  </mat-card-content>
</mat-card>
.simple-expression-editor {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;

  .expression-input {
    margin-bottom: 20px;

    .editable-div {
      width: 100%;
      min-height: 100px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
      background-color: white;
      overflow-y: auto;

      &:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
      }

      &:empty:before {
        content: attr(placeholder);
        color: #999;
      }

      .highlighted-property {
        background-color: #e7ffe7;
        border: 1px solid #4CAF50;
        border-radius: 3px;
        padding: 0 4px;
        margin: 0 2px;
        display: inline-block;
      }
    }
  }

  .highlighted-view {
    margin-bottom: 20px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    min-height: 50px;
    font-family: monospace;
    font-size: 14px;
    background-color: #f8f9fa;

    .highlighted-property {
      background-color: #e7ffe7;
      border: 1px solid #4CAF50;
      border-radius: 3px;
      padding: 0 4px;
      margin: 0 2px;
      display: inline-block;
    }
  }

  .raw-view {
    margin-bottom: 20px;
    
    h4 {
      margin: 0 0 10px 0;
      color: #666;
    }

    pre {
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      margin: 0;
      font-family: monospace;
      font-size: 14px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  }

  .property-selector {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
    align-items: center;

    select {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      min-width: 200px;
      
      &:focus {
        outline: none;
        border-color: #007bff;
      }
    }

    button {
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background-color: #0056b3;
      }
    }
  }

  .operator-toolbar {
    .toolbar-section {
      margin-bottom: 15px;

      .section-label {
        display: inline-block;
        margin-right: 10px;
        font-weight: bold;
        color: #666;
      }

      button {
        margin: 0 5px;
        padding: 6px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #f8f9fa;
        cursor: pointer;
        min-width: 40px;
        font-family: monospace;

        &:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
        }

        &.function-btn {
          background-color: #e9ecef;
          font-weight: bold;
        }
      }
    }
  }
} 