import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import Quill from 'quill';

@Component({
  selector: 'app-quill-editor',
  templateUrl: './quill-editor.component.html',
  styleUrls: ['./quill-editor.component.scss'],
  standalone: true
})
export class QuillEditorComponent implements AfterViewInit {
  @ViewChild('editor') editorElement!: ElementRef;
  quill: any;

  ngAfterViewInit() {
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
              handler: () => false
            }
          }
        }
      },
      theme: 'snow',
      placeholder: 'Build your expression here...'
    });

    // Set initial focus and selection
    this.quill.focus();
    this.quill.setSelection(0, 0);

    // Store selection on editor blur
    let lastSelection: any = null;
    this.quill.on('selection-change', (range: any) => {
      if (range) {
        lastSelection = range;
      }
    });

    // Restore selection on editor focus
    this.quill.root.addEventListener('focus', () => {
      if (lastSelection) {
        this.quill.setSelection(lastSelection);
      }
    });

    this.quill.on('text-change', (delta: any, oldContents: any, source: string) => {
      if (source === 'user') {
        const contents = this.quill.getContents();
        let changed = false;
        const newOps = contents.ops.map((op: any) => {
          if (op.insert && typeof op.insert === 'string') {
            const isProgrammatic = op.attributes?.color === 'red' ||
              (op.attributes?.color === 'black' && /^(\s*[+\-\/]|\s+|\s*[A-Z][a-z]+\s*\(|\s*\)|\s*,\s*)$/.test(op.insert));
            
            if (!isProgrammatic) {
              const filtered = op.insert.replace(/[a-zA-Z]+/g, '');
              if (filtered !== op.insert) {
                changed = true;
                return { ...op, insert: filtered };
              }
            }
          }
          return op;
        }).filter((op: any) => !(op.insert === ''));
        
        if (changed) {
          const selection = this.quill.getSelection();
          this.quill.setContents({ ops: newOps }, 'api');
          if (selection) {
            let newIndex = selection.index;
            if (newIndex > this.quill.getLength() - 1) {
              newIndex = this.quill.getLength() - 1;
            }
            this.quill.setSelection(newIndex, 0, 'api');
          }
        }
      }
    });
  }

  insertProperty(property: string) {
    if (!this.quill) return;
    
    // Force get the current selection
    const range = this.quill.getSelection(true);
    const index = range ? range.index : this.quill.getLength();
    
    console.log('Inserting property at index:', index);
    
    // First format the text at the position
    this.quill.formatText(index, property.length, 'color', 'red', 'api');
    
    // Then insert the property
    this.quill.insertText(index, property, { color: 'red' }, 'api');
    
    // Add space after property
    this.quill.insertText(index + property.length, ' ', { color: 'black' }, 'api');
    
    // Move cursor after inserted text
    this.quill.setSelection(index + property.length + 1, 0, 'api');
  }

  insertOperator(operator: string) {
    const index = this.quill.getSelection()?.index || this.quill.getLength();
    this.quill.insertText(index, ` ${operator} `, { color: 'black' });
    this.quill.setSelection(index + operator.length + 2);
  }

  insertFunction(func: string) {
    const range = this.quill.getSelection();
    if (range && range.length > 0) {
      const contents = this.quill.getContents(range.index, range.length);
      const propertyOps = contents.ops.filter((op: any) => 
        op.attributes?.color === 'red' && typeof op.insert === 'string');
      
      if (propertyOps.length > 0) {
        this.quill.deleteText(range.index, range.length);
        let currentIndex = range.index;
        this.quill.insertText(currentIndex, `${func}(`, { color: 'black' });
        currentIndex += func.length + 1;
        
        propertyOps.forEach((op: any, idx: number) => {
          if (typeof op.insert === 'string') {
            const text = op.insert.trim();
            this.quill.insertText(currentIndex, text, { color: 'red' });
            currentIndex += text.length;
            if (idx < propertyOps.length - 1) {
              this.quill.insertText(currentIndex, ', ', { color: 'black' });
              currentIndex += 2;
            }
          }
        });
        
        this.quill.insertText(currentIndex, ')', { color: 'black' });
        this.quill.setSelection(currentIndex + 1);
      } else {
        this.quill.insertText(range.index, `${func}()`, { color: 'black' });
        this.quill.setSelection(range.index + func.length + 1);
      }
    } else {
      const index = this.quill.getSelection()?.index || this.quill.getLength();
      this.quill.insertText(index, `${func}()`, { color: 'black' });
      this.quill.setSelection(index + func.length + 1);
    }
  }
}
