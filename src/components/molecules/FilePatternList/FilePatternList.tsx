import {useEffect, useRef, useState} from 'react';

import {Button, Input, Tooltip} from 'antd';

import styled from 'styled-components';

import {ROOT_FILE_ENTRY} from '@constants/constants';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {setScanExcludesStatus} from '@redux/reducers/appConfig';
import {setRootFolder} from '@redux/thunks/setRootFolder';

import {useOnClickOutside} from '@hooks/useOnClickOutside';

import {useFocus} from '@utils/hooks';

import FilePatternListItem from './FilePatternListItem';

type FilePatternListProps = {
  value: string[];
  onChange: (patterns: string[]) => void;
  tooltip: string;
  isSettingsOpened?: boolean;
  type?: 'excludes' | 'includes';
};

const StyledUl = styled.ul`
  padding-left: 20px;
`;

const StyledButton = styled(Button)`
  margin-top: 10px;
  margin-right: 5px;
  margin-bottom: 10px;
`;

const FilePatternList = (props: FilePatternListProps) => {
  const {value, onChange, tooltip, isSettingsOpened, type} = props;

  const dispatch = useAppDispatch();

  const [isAddingPattern, setIsAddingPattern] = useState<boolean>(false);
  const [patternInput, setPatternInput] = useState<string>('');
  const [inputRef, focusInput] = useFocus<Input>();
  const filePatternInputRef = useRef<any>();
  const appConfig = useAppSelector(state => state.config);
  const rootFileEntry = useAppSelector(state => state.main.fileMap[ROOT_FILE_ENTRY]);

  useOnClickOutside(filePatternInputRef, () => {
    setIsAddingPattern(false);
    setPatternInput('');
  });

  const isPatternUnique = (patternStr: string) => {
    return !value.includes(patternStr);
  };

  const addPattern = () => {
    if (value.includes(patternInput)) {
      return;
    }
    onChange([...value, patternInput]);
    setIsAddingPattern(false);
    setPatternInput('');
  };

  const removePattern = (pattern: string) => {
    onChange(value.filter(p => p !== pattern));
  };

  const updatePattern = (oldPattern: string, newPattern: string) => {
    const index = value.indexOf(oldPattern);
    const left = value.slice(0, index);
    const right = value.slice(index + 1);
    onChange([...left, newPattern, ...right]);
  };

  const onClickCancel = () => {
    setIsAddingPattern(false);
    setPatternInput('');
  };

  useEffect(() => {
    if (isAddingPattern) {
      focusInput();
    }
  }, [isAddingPattern, focusInput]);

  useEffect(() => {
    if (!isSettingsOpened) {
      setIsAddingPattern(false);
      setPatternInput('');
    }
  }, [isSettingsOpened]);

  if (!rootFileEntry) {
    return null;
  }

  return (
    <div>
      <StyledUl>
        {value.map(pattern => (
          <FilePatternListItem
            key={pattern}
            pattern={pattern}
            validateInput={isPatternUnique}
            onChange={(oldPattern, newPattern) => updatePattern(oldPattern, newPattern)}
            onRemove={() => removePattern(pattern)}
          />
        ))}
      </StyledUl>
      {isAddingPattern ? (
        <div ref={filePatternInputRef}>
          <Input
            ref={inputRef}
            defaultValue={patternInput}
            onChange={e => setPatternInput(e.target.value)}
            onPressEnter={addPattern}
          />
          <StyledButton onClick={addPattern}>OK</StyledButton>
          <StyledButton onClick={onClickCancel}>Cancel</StyledButton>
        </div>
      ) : (
        <>
          <Tooltip title={tooltip}>
            <Button onClick={() => setIsAddingPattern(true)} style={{marginRight: 10}}>
              Add Pattern
            </Button>
          </Tooltip>
          {appConfig.isScanExcludesUpdated === 'outdated' && type === 'excludes' ? (
            <Button
              onClick={() => {
                dispatch(setScanExcludesStatus('applied'));
                dispatch(setRootFolder(rootFileEntry.filePath));
              }}
            >
              Apply changes
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
};

export default FilePatternList;
