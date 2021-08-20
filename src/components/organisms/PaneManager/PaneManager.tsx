import React, {useState, useContext} from 'react';
import styled from 'styled-components';
import 'antd/dist/antd.less';
import {Button, Space, Tooltip} from 'antd';
import {ClusterOutlined, FolderOpenOutlined, ApartmentOutlined, CodeOutlined} from '@ant-design/icons';
import Colors, {BackgroundColors} from '@styles/Colors';
import {AppBorders} from '@styles/Borders';
import {Row, Col, Content} from '@atoms';
import {LogViewer, GraphView, SplitView} from '@molecules';
import {ActionsPane, NavigatorPane, FileTreePane} from '@organisms';
import featureJson from '@src/feature-flags.json';
import ClustersPane from '@organisms/ClustersPane';
import {ClusterExplorerTooltip, FileExplorerTooltip} from '@constants/tooltips';
import {TOOLTIP_DELAY} from '@constants/constants';
import {useAppSelector, useAppDispatch} from '@redux/hooks';
import {toggleLeftMenu, toggleRightMenu, setLeftMenuSelection, setRightMenuSelection} from '@redux/reducers/ui';
import AppContext from '@src/AppContext';

const StyledRow = styled(Row)`
  background-color: ${BackgroundColors.darkThemeBackground};
  width: 100%;
  padding: 0px;
  margin: 0px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
`;
const StyledColumnLeftMenu = styled(Col)`
  background-color: ${BackgroundColors.darkThemeBackground};
  height: 100%;
  padding: 0px;
  margin: 0px;
  border-right: ${AppBorders.pageDivider};
`;
const StyledColumnPanes = styled(Col)`
  background-color: ${BackgroundColors.darkThemeBackground};
  height: 100%;
  padding: 0px;
  margin: 0px;
  overflow-x: visible !important;
  overflow-y: visible !important;
`;
const StyledColumnRightMenu = styled(Col)`
  background-color: ${BackgroundColors.darkThemeBackground};
  height: 100%;
  padding: 0px;
  margin: 0px;
  border-left: ${AppBorders.pageDivider};
`;

const StyledContent = styled(Content)`
  overflow-y: clip;
`;

const MenuIcon = (props: {
  icon: React.ElementType;
  active: boolean;
  isSelected: boolean;
  style?: React.CSSProperties;
}) => {
  const {icon: IconComponent, active, isSelected, style: customStyle = {}} = props;
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const style = {
    ...customStyle,
    fontSize: 25,
    color: Colors.grey7,
  };

  if (isHovered || (active && isSelected)) {
    style.color = Colors.grey400;
  }

  return (
    <IconComponent style={style} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} />
  );
};

const iconMenuWidth = 45;

const PaneManager = () => {
  const dispatch = useAppDispatch();
  const {windowSize} = useContext(AppContext);

  const contentWidth = windowSize.width - (featureJson.ShowRightMenu ? 2 : 1) * iconMenuWidth;
  const contentHeight = windowSize.height - 75;

  const leftMenuSelection = useAppSelector(state => state.ui.leftMenu.selection);
  const leftActive = useAppSelector(state => state.ui.leftMenu.isActive);
  const rightMenuSelection = useAppSelector(state => state.ui.rightMenu.selection);
  const rightActive = useAppSelector(state => state.ui.rightMenu.isActive);

  const setActivePanes = (side: string, selectedMenu: string) => {
    if (side === 'left') {
      if (leftMenuSelection === selectedMenu) {
        dispatch(toggleLeftMenu());
      } else {
        dispatch(setLeftMenuSelection(selectedMenu));
        if (!leftActive) {
          dispatch(toggleLeftMenu());
        }
      }
    }

    if (side === 'right' && featureJson.ShowRightMenu) {
      if (rightMenuSelection === selectedMenu) {
        dispatch(toggleRightMenu());
      } else {
        dispatch(setRightMenuSelection(selectedMenu));
        if (!rightActive) {
          dispatch(toggleRightMenu());
        }
      }
    }
  };

  return (
    <StyledContent style={{height: contentHeight}}>
      <StyledRow style={{height: contentHeight + 4}}>
        <StyledColumnLeftMenu>
          <Space direction="vertical" style={{width: 43}}>
            <Tooltip mouseEnterDelay={TOOLTIP_DELAY} title={FileExplorerTooltip} placement="right">
              <Button
                size="large"
                type="text"
                onClick={() => setActivePanes('left', 'file-explorer')}
                icon={
                  <MenuIcon
                    style={{marginLeft: 4}}
                    icon={FolderOpenOutlined}
                    active={leftActive}
                    isSelected={leftMenuSelection === 'file-explorer'}
                  />
                }
              />
            </Tooltip>
            <Tooltip mouseEnterDelay={TOOLTIP_DELAY} title={ClusterExplorerTooltip} placement="right">
              <Button
                size="large"
                type="text"
                onClick={() => setActivePanes('left', 'cluster-explorer')}
                icon={
                  <MenuIcon
                    icon={ClusterOutlined}
                    active={leftActive}
                    isSelected={leftMenuSelection === 'cluster-explorer'}
                  />
                }
              />
            </Tooltip>
          </Space>
        </StyledColumnLeftMenu>
        <StyledColumnPanes style={{width: contentWidth}}>
          <SplitView
            contentWidth={contentWidth}
            contentHeight={contentHeight}
            left={
              <>
                <div style={{display: leftMenuSelection === 'file-explorer' ? 'inline' : 'none'}}>
                  <FileTreePane />
                </div>
                <div
                  style={{
                    display:
                      featureJson.ShowClusterView && leftMenuSelection === 'cluster-explorer' ? 'inline' : 'none',
                  }}
                >
                  <ClustersPane />
                </div>
              </>
            }
            hideLeft={!leftActive}
            nav={<NavigatorPane />}
            editor={<ActionsPane contentHeight={`${contentHeight}px`} />}
            right={
              <>
                {featureJson.ShowGraphView && rightMenuSelection === 'graph' ? (
                  <GraphView editorHeight={`${contentHeight}px`} />
                ) : undefined}
                <div style={{display: rightMenuSelection === 'logs' ? 'inline' : 'none'}}>
                  <LogViewer editorHeight={`${contentHeight}px`} />
                </div>
              </>
            }
            hideRight={!rightActive}
          />
        </StyledColumnPanes>
        <StyledColumnRightMenu style={{display: featureJson.ShowRightMenu ? 'inline' : 'none'}}>
          <Space direction="vertical" style={{width: 43}}>
            <Button
              size="large"
              type="text"
              onClick={() => setActivePanes('right', 'graph')}
              icon={
                <MenuIcon icon={ApartmentOutlined} active={rightActive} isSelected={rightMenuSelection === 'graph'} />
              }
              style={{display: featureJson.ShowGraphView ? 'inline' : 'none'}}
            />

            <Button
              size="large"
              type="text"
              onClick={() => setActivePanes('right', 'logs')}
              icon={<MenuIcon icon={CodeOutlined} active={rightActive} isSelected={rightMenuSelection === 'logs'} />}
            />
          </Space>
        </StyledColumnRightMenu>
      </StyledRow>
    </StyledContent>
  );
};

export default PaneManager;
