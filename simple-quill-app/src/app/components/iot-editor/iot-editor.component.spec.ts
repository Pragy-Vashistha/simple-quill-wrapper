import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IotEditorComponent } from './iot-editor.component';

describe('IotEditorComponent', () => {
  let component: IotEditorComponent;
  let fixture: ComponentFixture<IotEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IotEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IotEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
