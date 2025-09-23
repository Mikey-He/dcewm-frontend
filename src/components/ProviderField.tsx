import React from 'react';
import { Dropdown } from './Dropdown';

interface ProviderFieldProps {
  value: string;
  onChange: (value: string) => void;
  providers: string[];
}

export const ProviderField: React.FC<ProviderFieldProps> = ({
  value,
  onChange,
  providers
}) => {
  return (
    <Dropdown
      value={value}
      onChange={(val) => onChange(val as string)}
      options={providers}
      placeholder="Type or select provider"
      searchable={true}
      multiple={false}
    />
  );
};