import { Component, ViewChild } from '@angular/core';
import { PropertyDropdownComponent } from '../property-dropdown/property-dropdown.component';
import { QuillEditorComponent } from '../quill-editor/quill-editor.component';

@Component({
  selector: 'app-iot-editor',
  standalone: true,
  imports: [PropertyDropdownComponent, QuillEditorComponent],
  templateUrl: './iot-editor.component.html',
  styleUrl: './iot-editor.component.scss'
})
export class IotEditorComponent {
  @ViewChild(QuillEditorComponent) editor!: QuillEditorComponent;

  onPropertySelected(property: string) {
    this.editor.insertProperty(property);
  }
}
