import React from 'react';
import Select, { GroupBase, StylesConfig, Props as SelectProps } from 'react-select';
import { twMerge } from 'tailwind-merge';

// ----------------------------------------------------------------------

interface OptionSelectInterface {
  label: string;
  value: string;
}

interface GroupedOptionSelectInterface extends GroupBase<OptionSelectInterface> {
  label: string; // sekarang wajib
  options: OptionSelectInterface[];
}

export interface SelectFieldProps extends SelectProps<OptionSelectInterface, false, GroupedOptionSelectInterface> {
  label?: string;
  containerClassname?: string;
  inputClassname?: string;
  labelClassname?: string;
}

const customStyleSelect: StylesConfig<OptionSelectInterface, false, GroupedOptionSelectInterface> = {
  control: (provided, state) => ({
    ...provided,
    borderWidth: '1px',
    borderColor: state.isDisabled ? '#a3a3a3' : state.isFocused ? '#15803D' : '#DEDEDE',
    boxShadow: state.isFocused ? '0 0 0 1px #15803D' : 'none',
    backgroundColor: state.isDisabled ? '#d4d4d4' : '#FAFAFA',
    minWidth: '150px',
    width: '100%',
    fontSize: '14px',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    padding: '3px 0',
    borderRadius: '6px',
    transition: 'all 300ms',
    fontFamily: 'Poppins, "sans-serif"',
    ':hover': { borderColor: '#15803D' },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'black',
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: '14px',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 300ms',
    fontFamily: 'Poppins, "sans-serif"',
    color: state.isDisabled ? (state.isSelected ? 'white' : '#a3a3a3') : state.isSelected ? 'white' : 'black',
    backgroundColor: state.isSelected ? '#15803D' : 'white',
    ':hover': { backgroundColor: state.isDisabled ? (state.isSelected ? '#15803D' : 'transparent') : '#15803D', color: state.isDisabled ? (state.isSelected ? 'white' : '#a3a3a3') : 'white' },
  }),
};

// ----------------------------------------------------------------------

const SelectField: React.FC<SelectFieldProps> = ({ label, containerClassname, inputClassname, labelClassname, styles = customStyleSelect, ...props }) => {
  return (
    <label className={twMerge('form-control w-full gap-2', containerClassname)}>
      {label && <span className={twMerge('text-sm text-[#404040]', labelClassname)}>{label}</span>}

      <Select<OptionSelectInterface, false, GroupedOptionSelectInterface>
        styles={{
          ...styles,
          menuPortal: (base) => ({
            ...base,
            zIndex: 9999,
          }),
        }}
        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        components={{
          IndicatorSeparator: () => null,
        }}
        className={twMerge('basic-single', inputClassname)}
        classNamePrefix="select"
        {...props}
      />
    </label>
  );
};

export default SelectField;
