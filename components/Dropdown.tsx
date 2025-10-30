import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Assuming this library is used

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  options: DropdownOption[];
  selectedValue: string;
  onValueChange: (itemValue: string, itemIndex: number) => void;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ options, selectedValue, onValueChange, placeholder }) => {
  return (
    <View style={styles.container}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker}
      >
        {placeholder && <Picker.Item label={placeholder} value="" />}
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 50,
  },
});

export default Dropdown;