import { Component } from '@angular/core';
import { IotEditorComponent } from './components/iot-editor/iot-editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IotEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Quill.js Wrapper Demo';
}
