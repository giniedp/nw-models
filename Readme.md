# New World Models

This tool extracts and converts New World game models into a web-ready format (gltf, glb).

# Installation

You need to clone and build the project. This is not available on NPM.

Make sure your environment meets the following requirements:

- Node 22
- pnpm
- enough disk space

Disk space requirements depend on which models and how many you want to extract. Intermediate files, especially textures eat up a lot of space. Additionally textures are embedded in the final model file.

Clone the repo

```
git clone git@github.com:giniedp/nw-models.git
```

Then install dependencies and build 

```
pnpm install
pnpm build
```

# Unpack data

Copy the `.env.example` file to `.env` and adjust it to your needs. You must at leas set the `NW_GAME_DIR` variable.

Unpack game data (**required**)
```
pnpm unpack
```

Convert the assetcatalog (**required**, used to lookup asset paths)
``` 
pnpm convert-catalog
```

Convert the datasheeds (**recommended**, if you want to extract mounts and gear etc. as defined in datasheets)
``` 
pnpm convert-tables
```

Convert the engine slices to json format. (**optional**, if you want to extract full dungeon levels, housing items)
This is a long running operation.
``` 
pnpm convert-slices
```

# Conversion command

The conversion command is
```
pnpm convert-models [options]
```

All purpose options are
```
-u, --update <mode>                 Ignores previously converted and exported data and overrides files. (may be all or models) (default: "all")
-tc, --thread-count <threadCount>   Number of threads (disables debug log if greather than 0)
-ts, --texture-size <textureSize>   Resize all textures to given size.
--embed                             Embeds binary buffer inside the model file (default: true)
--no-embed                          Does not embed binary buffer inside the model file
--webp                              Converts textures to wepb instead of png before embedding into model (default: false)
--glb                               Exports binary GLTF .glb files instead of .gltf JSON (default: false)
--verbose                           Enables log output (automatically enabled if threads is 0)
```

Conversion specific options are as follows:

```
-cdf, --cdf <cdfFile>               Convert a specific .cdf file. (may be glob pattern)
```

```
-cgf, --cgf <cgfFile>               Convert a specific .cgf (or .skin) file. (may be glob pattern)
```

```
-slice, --slice <sliceFile>         Converts models from .dynamicslice files. (may be glob pattern)
-recursive, --recursive             Recursively process slice file. (potentially huge model output)
```

To convert a level directory. This is work in progress. This currently only works for the main menu level yet not for dungeons.
```
-level, --level [ids...]            Converts levels from levels directory.
```

To convert capital files. Point it to a dungeon folder to extract the dungeon level geometry.
This is work in progress and will later become part of `-level` option
```
-capital, --capital <capitalFile>   Converts models from .capitals files. (may be glob pattern)
-merge, --merge                     Merges all capital files into one giant model.
```

To convert halloween costumes from datasheets. Requires `convert-datasheets` to be run.
```
-costumes, --costumes [ids...]      Converts all costumes from costumes table. Models are placed in "costumechanges" directory. If list of ids is provided, only those costumes are converted.
```

To convert npcs from datasheets. Requires `convert-datasheets` to be run.
```
-npcs, --npcs [ids...]              Converts all npcs from npcs table. Models are placed in "npcs" directory. If list of ids is provided, only those npcs are converted.
```

To convert mounts from datasheets. Requires `convert-datasheets` to be run.
```
-mounts, --mounts [ids...]          Converts all mounts from mounts table. Models are placed in "mounts" directory. If list of ids is provided, only those mounts are converted.
```

To convert housing items from datasheets. Requires `convert-datasheets` AND `convert-slcies` to be run.
```
-housing, --housing [ids...]        Converts all housing items from housing items tables. Models are placed in "housingitems" directory. If list of ids is provided, only those items are converted.
```

To convert appearance items (transmog) from datasheets. Requires `convert-datasheets` to be run.
```
-appearance, --appearance [ids...]  Converts weapon,item,instrument appearances.
```

To convert vitals. This is work in progress and requires a hand crafted json file for what to be converted.
```
-file, --file [specFile]
-id, --id [ids...]
```

# Preview Models

To preview the converted models, run

```
pnpm viewer
```

This will start a server and open the browser listing all converted models, allowing you to preview them.

# Planned

- Optimize textures (https://www.khronos.org/assets/uploads/apis/KTX-2.0-Launch-Overview-Apr21_.pdf)
