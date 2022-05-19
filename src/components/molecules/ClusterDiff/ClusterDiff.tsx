import {Divider} from 'antd';

import {ResourceFilterIconWithPopover} from '@components/molecules';

import * as S from './ClusterDiff.styled';
import ClusterDiffNamespaceFilter from './ClusterDiffNamespaceFilter';

function ClusterDiff() {
  return (
    <S.Container>
      <S.TitleBar>
        <S.TitleBarRightButtons>
          <ClusterDiffNamespaceFilter />
          <S.FilterContainer>
            <ResourceFilterIconWithPopover />
          </S.FilterContainer>
        </S.TitleBarRightButtons>
      </S.TitleBar>
      <Divider style={{margin: '8px 0'}} />
      <S.ListContainer>
        <S.List id="cluster-diff-sections-container" />
      </S.ListContainer>
    </S.Container>
  );
}

export default ClusterDiff;
