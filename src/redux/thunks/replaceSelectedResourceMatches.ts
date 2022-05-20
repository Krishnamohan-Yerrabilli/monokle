import {createAsyncThunk} from '@reduxjs/toolkit';

import log from 'loglevel';
import {parse, stringify} from 'yaml';

import {AppDispatch} from '@models/appdispatch';
import {RootState} from '@models/rootstate';

import {UpdateMultipleResourcesPayload} from '@redux/reducers/main';
import {updateMultipleResources} from '@redux/thunks/updateMultipleResources';

import {removeIgnoredPathsFromResourceContent} from '@utils/resources';

export const replaceSelectedResourceMatches = createAsyncThunk<
  void,
  undefined,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>('main/replaceSelectedResourceMatches', async (_, thunkAPI) => {
  const state = thunkAPI.getState();

  const clusterToLocalResourcesMatches = state.main.clusterDiff.clusterToLocalResourcesMatches;
  const resourceMap = state.main.resourceMap;
  const selectedMatches = state.main.clusterDiff.selectedMatches;

  if (selectedMatches.length === 0) {
    return;
  }
  setImmediate(() => {
    try {
      const updateMultipleResourcesPayload: UpdateMultipleResourcesPayload = selectedMatches
        .map(matchId => {
          const currentMatch = clusterToLocalResourcesMatches.find(m => m.id === matchId);
          if (!currentMatch?.localResourceIds?.length || !currentMatch?.clusterResourceId) {
            return undefined;
          }

          const clusterResource = resourceMap[currentMatch.clusterResourceId];

          const originalClusterResourceContent = parse(clusterResource.text);
          const cleanClusterResourceContent = removeIgnoredPathsFromResourceContent(originalClusterResourceContent);

          const cleanClusterResourceText = stringify(cleanClusterResourceContent, {sortMapEntries: true});

          return {
            resourceId: currentMatch.localResourceIds[0],
            content: cleanClusterResourceText,
          };
        })
        .filter((id): id is {resourceId: string; content: string} => Boolean(id) === true);

      thunkAPI.dispatch(updateMultipleResources(updateMultipleResourcesPayload));
    } catch (e) {
      log.error('Failed to replace selected resources');
      log.error(e);
    }
  });
});
