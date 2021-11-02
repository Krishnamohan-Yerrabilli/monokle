import {getTestResourcePath} from '@redux/services/__test__/utils';
import {processKustomizations} from '@redux/services/kustomize';
import {readManifests} from '@redux/services/fileEntry';

test('multiple-patches', () => {
  const {resourceMap, fileMap} = readManifests(getTestResourcePath('manifests/kustomizationWithMultiplePatches'));
  processKustomizations(resourceMap, fileMap);

  const resources = Object.values(resourceMap);
  expect(resources.length).toBe(1);
  const kustomization = resources[0];
  expect(kustomization.refs?.length).toBe(2);
});
