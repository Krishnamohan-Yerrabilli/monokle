import React, {useState, useEffect} from 'react';
import micromatch from 'micromatch';
import {useSelector} from 'react-redux';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {MonoSectionTitle} from '@components/atoms';
import {K8sResource} from '@models/k8sresource';
import {NavigatorSection, NavigatorSubSection} from '@models/navigator';
import {activeResourcesSelector} from '@redux/selectors';
import {selectK8sResource} from '@redux/reducers/main';
import {getNamespaces} from '@redux/services/resource';
import NavigatorContentTitle from './NavigatorContentTitle';
import NamespacesSection from './NamespacesSection';
import SectionRow from './SectionRow';
import SectionCol from './SectionCol';
import Section from './Section';
import {ALL_NAMESPACES} from '../constants';

const ResourcesSection = (props: {navigatorHeight: number | undefined}) => {
  const {navigatorHeight} = props;
  const dispatch = useAppDispatch();
  const appConfig = useAppSelector(state => state.config);
  const resourceMap = useAppSelector(state => state.main.resourceMap);
  const previewResource = useAppSelector(state => state.main.previewResourceId);
  const selectedResourceId = useAppSelector(state => state.main.selectedResourceId);
  const activeResources = useSelector(activeResourcesSelector);

  const [namespace, setNamespace] = useState<string>(ALL_NAMESPACES);
  const [namespaces, setNamespaces] = useState<string[]>([ALL_NAMESPACES]);

  useEffect(() => {
    let ns = getNamespaces(resourceMap);
    setNamespaces(ns.concat([ALL_NAMESPACES]));
    if (namespace && ns.indexOf(namespace) === -1) {
      setNamespace(ALL_NAMESPACES);
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [resourceMap, previewResource]); // es-lint-disable

  const handleNamespaceChange = (value: any) => {
    setNamespace(value);
  };

  const selectResource = (resourceId: string) => {
    dispatch(selectK8sResource(resourceId));
  };

  const [expandedSubsectionsBySection, setExpandedSubsectionsBySection] = useState<Record<string, string[]>>(
    // set all subsections of each section as expanded by default
    Object.fromEntries(
      appConfig.navigators
        .map(navigator => navigator.sections)
        .flat()
        .map(section => [section.name, section.subsections.map(subsection => subsection.name)])
    )
  );

  const handleSubsectionExpand = (sectionName: string, subsectionName: string) => {
    const currentExpandedSubsections = [...(expandedSubsectionsBySection[sectionName] || [])];
    const updatedSubsectionsBySection = {
      ...expandedSubsectionsBySection,
      [sectionName]: [...new Set([...currentExpandedSubsections, subsectionName])],
    };
    setExpandedSubsectionsBySection(updatedSubsectionsBySection);
  };

  const handleSubsectionCollapse = (sectionName: string, subsectionName: string) => {
    setExpandedSubsectionsBySection({
      ...expandedSubsectionsBySection,
      [sectionName]: expandedSubsectionsBySection[sectionName].filter(s => s !== subsectionName),
    });
  };

  function shouldResourceBeVisible(item: K8sResource, subsection: NavigatorSubSection) {
    return (
      item.kind === subsection.kindSelector &&
      micromatch.isMatch(item.version, subsection.apiVersionSelector) &&
      (namespace === ALL_NAMESPACES || item.namespace === namespace || (namespace === 'default' && !item.namespace)) &&
      Object.values(resourceMap).length > 0
    );
  }

  function shouldSectionBeVisible(section: NavigatorSection) {
    return (
      activeResources.length === 0 ||
      (activeResources.length > 0 && section.subsections.some(subsection => shouldSubsectionBeVisible(subsection)))
    );
  }

  function shouldSubsectionBeVisible(subsection: NavigatorSubSection) {
    return (
      activeResources.length === 0 ||
      (activeResources.length > 0 && activeResources.some(resource => resource.kind === subsection.kindSelector))
    );
  }

  // ensure that subsections containing selected or highlighted sections are expanded
  useEffect(() => {
    const subsectionsToExpandBySection: Record<string, string[]> = {};
    appConfig.navigators
      .map(navigator => navigator.sections)
      .flat()
      .forEach(section => {
        section.subsections
          .filter(subsection => shouldSubsectionBeExpanded(subsection))
          .forEach(subsection => {
            if (!subsectionsToExpandBySection[section.name]) {
              subsectionsToExpandBySection[section.name] = [subsection.name];
            } else {
              subsectionsToExpandBySection[section.name] = [
                ...subsectionsToExpandBySection[section.name],
                subsection.name,
              ];
            }
          });
      });
    const updatedExpandedSubsectionsBySection: Record<string, string[]> = Object.fromEntries(
      Object.entries(expandedSubsectionsBySection).map(([sectionName, expandedSubsections]) => {
        const subsectionsToExpand = [...(subsectionsToExpandBySection[sectionName] || [])];
        return [sectionName, [...new Set([...expandedSubsections, ...subsectionsToExpand])]];
      })
    );
    setExpandedSubsectionsBySection(updatedExpandedSubsectionsBySection);
  }, [resourceMap, selectedResourceId]);

  function shouldSubsectionBeExpanded(subsection: NavigatorSubSection) {
    return (
      activeResources.length === 0 ||
      (activeResources.length > 0 &&
        activeResources.some(
          resource =>
            resource.kind === subsection.kindSelector && (resource.isHighlighted || selectedResourceId === resource.id)
        ))
    );
  }

  return (
    <SectionRow>
      <SectionCol>
        {appConfig.navigators.map(navigator => {
          return (
            <div key={navigator.name}>
              <SectionRow>
                <MonoSectionTitle>{navigator.name}</MonoSectionTitle>
              </SectionRow>
              <SectionRow>
                {navigator.name === 'K8s Resources' && (
                  <NamespacesSection namespace={namespace} namespaces={namespaces} onSelect={handleNamespaceChange} />
                )}
              </SectionRow>
              <SectionRow>
                <SectionCol>
                  {navigator.sections
                    .filter(section => shouldSectionBeVisible(section))
                    .map(section => {
                      return (
                        <div key={section.name}>
                          {section.name.length > 0 && (
                            <SectionRow>
                              <NavigatorContentTitle>{section.name}</NavigatorContentTitle>
                            </SectionRow>
                          )}
                          <Section
                            navigatorHeight={navigatorHeight}
                            expandedSubsections={expandedSubsectionsBySection[section.name]}
                            onSubsectionExpand={handleSubsectionExpand}
                            onSubsectionCollapse={handleSubsectionCollapse}
                            section={section}
                            shouldResourceBeVisible={shouldResourceBeVisible}
                            shouldSubsectionBeVisible={shouldSubsectionBeVisible}
                            resources={activeResources}
                            selectResource={selectResource}
                          />
                        </div>
                      );
                    })}
                </SectionCol>
              </SectionRow>
            </div>
          );
        })}
      </SectionCol>
    </SectionRow>
  );
};

export default ResourcesSection;
