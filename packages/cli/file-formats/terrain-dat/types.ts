enum EERType
{
    eERType_NotRenderNode,
    eERType_Brush,
    eERType_Vegetation,
    eERType_Light,
    eERType_Cloud,
    eERType_TerrainSystem, // used to be eERType_Dummy_1 which used to be eERType_VoxelObject, preserve order for compatibility
    eERType_FogVolume,
    eERType_Decal,
    eERType_ParticleEmitter,
    eERType_WaterVolume,
    eERType_Dummy_5, // used to be eERType_WaterWave, preserve order for compatibility
    eERType_Road,
    eERType_DistanceCloud,
    eERType_VolumeObject,
    eERType_Dummy_0, // used to be eERType_AutoCubeMap, preserve order for compatibility
    eERType_Rope,
    eERType_PrismObject,
    eERType_Dummy_2, // used to be eERType_IsoMesh, preserve order for compatibility
    eERType_Dummy_4,
    eERType_RenderComponent,
    eERType_GameEffect,
    eERType_BreakableGlass,
    eERType_Dummy_3, // used to be eERType_LightShape, preserve order for compatibility
    eERType_MergedMesh,
    eERType_GeomCache,
    eERType_StaticMeshRenderComponent,
    eERType_DynamicMeshRenderComponent,
    eERType_SkinnedMeshRenderComponent,
    eERType_TypesNum, // MUST BE AT END TOTAL NUMBER OF ERTYPES
};
