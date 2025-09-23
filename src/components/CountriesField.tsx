import React from 'react';
import { Dropdown } from './Dropdown';

interface CountriesFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  countries: string[];
}

export const CountriesField: React.FC<CountriesFieldProps> = ({
  value,
  onChange,
  countries
}) => {
  return (
    <Dropdown
      value={value}
      onChange={(val) => onChange(val as string[])}
      options={countries}
      placeholder="Select countries"
      searchable={true}
      multiple={true}
    />
  );
};