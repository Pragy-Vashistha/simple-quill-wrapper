import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-property-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './property-dropdown.component.html',
  styleUrl: './property-dropdown.component.scss'
})
export class PropertyDropdownComponent {
  properties: string[] = ['speed', 'temperature', 'pressure'];
  selectedProperty: string = '';

  @Output() propertySelected = new EventEmitter<string>();

  onOpenedChange(isOpen: boolean) {
    console.log('Dropdown opened/closed:', isOpen);
    console.log('Selected property:', this.selectedProperty);
    
    if (!isOpen && this.selectedProperty) {
      setTimeout(() => {
        console.log('Emitting selected property:', this.selectedProperty);
        this.propertySelected.emit(this.selectedProperty);
        this.selectedProperty = '';
      }, 0);
    }
  }

  onSelectionChange(value: string) {
    console.log('Selection changed to:', value);
    this.selectedProperty = value;
    
    this.propertySelected.emit(value);
    this.selectedProperty = '';
  }
}
