import {useMemo, useState} from 'react';

import {Button, Input, Select} from 'antd';

import {HELM_INSTALL_OPTIONS_DOCS_URL, HELM_TEMPLATE_OPTIONS_DOCS_URL} from '@constants/constants';
import {helmInstallOptions, helmTemplateOptions} from '@constants/helmOptions';

import {HelmValuesFile} from '@models/helm';

import {useAppSelector} from '@redux/hooks';

import {KeyValueInput, SortableList} from '@components/atoms';
import {SortableListItem} from '@components/atoms/SortableList';

import * as S from './styled';

const PreviewConfigurationEditor = () => {
  const helmPreviewMode = useAppSelector(
    state => state.config.projectConfig?.settings?.helmPreviewMode || state.config.settings.helmPreviewMode
  );

  const helmChart = useAppSelector(state => {
    const helmChartId = state.main.prevConfEditor.helmChartId;
    if (!helmChartId) {
      return undefined;
    }
    return state.main.helmChartMap[helmChartId];
  });

  const valuesFiles = useAppSelector(
    state =>
      helmChart?.valueFileIds
        .map(id => state.main.helmValuesMap[id])
        .filter((v): v is HelmValuesFile => v !== undefined) || []
  );

  const [valuesFileItems, setValuesFileItems] = useState<SortableListItem[]>(
    valuesFiles.map(vf => ({id: vf.id, text: vf.name, isChecked: false}))
  );
  const [helmOptions, setHelmOptions] = useState({});
  const [helmCommand, setHelmCommand] = useState<'template' | 'install'>(helmPreviewMode || 'template');

  const keyValueInputSchema = useMemo(
    () => (helmCommand === 'template' ? helmTemplateOptions : helmInstallOptions),
    [helmCommand]
  );

  const helmOptionsDocsUrl = useMemo(
    () => (helmCommand === 'template' ? HELM_TEMPLATE_OPTIONS_DOCS_URL : HELM_INSTALL_OPTIONS_DOCS_URL),
    [helmCommand]
  );

  if (!helmChart) {
    return <p>Something went wrong, could not find the helm chart.</p>;
  }

  return (
    <div>
      <S.Field>
        <S.Label>Name your configuration:</S.Label>
        <Input placeholder="Enter the configuration name" />
      </S.Field>
      <S.Field>
        <S.Label style={{marginBottom: 0}}>Select which values files to use:</S.Label>
        <S.Description>Drag and drop to specify order</S.Description>
        <SortableList items={valuesFileItems} onChange={setValuesFileItems} />
      </S.Field>
      <S.Field>
        <S.Label>Select which helm command to use for this Preview:</S.Label>
        <Select value={helmCommand} onChange={setHelmCommand} style={{width: 100}}>
          <Select.Option value="template">Template</Select.Option>
          <Select.Option value="install">Install</Select.Option>
        </Select>
      </S.Field>
      <S.Field>
        <KeyValueInput
          label="Specify options:"
          value={helmOptions}
          schema={keyValueInputSchema}
          data={{}}
          docsUrl={helmOptionsDocsUrl}
          onChange={setHelmOptions}
        />
      </S.Field>
      <S.ActionsContainer>
        <Button type="primary" ghost>
          Discard
        </Button>
        <Button type="primary" ghost>
          Save
        </Button>
        <Button type="primary">Save and Preview</Button>
      </S.ActionsContainer>
    </div>
  );
};

export default PreviewConfigurationEditor;
