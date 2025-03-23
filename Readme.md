# ARCHIVE NOTE
The tools of this repo have been ported to go and are now part of http://github.com/giniedp/nw-buddy repository

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
  -ud, --unpack-dir [unpackDir]             Path to the unpacked game data directory (default: "../nw-data/custom")
  -cd, --convert-dir [convertDir]           Path to the intermediate data directory. Used for texture conversion and materials. Should not be same as unpack directory, it may overwrite existing DDS    
  -od, --output-dir [outputDir]             Path to the output directory (default: "out\\models")
  -skip, --skip [type]                      Skips existing assets from previous conversion. Use `-skip textures` to skip only textures. (default: false)
  -v, --verbose                             Enables log output (automatically enabled if --thread-count is set 0)

  -tc, --thread-count <threadCount>         Number of workers to spawn (default: "32")
  -ts, --texture-size <textureSize>         Maximum texture size.
  -tf, --texture-format <textureFormat>     Output texture format: png, jpeg, webp, avif, ktx. For ktx the toktx software must be installed.
  -tq, --texture-quality <textureQuality>   Texture conversion quality 0-100. Only used for png, jpeg, webp, avif
  -no-embed, --no-embed                     Does not embed binary buffer and textures inside the gltf file
  -glb, --glb                               Exports binary GLTF .glb files instead of .gltf JSON (default: false)
```

Conversion specific options are as follows:

Character definition files (including character animations)
```
  -cdf, --cdf <file...>                     Convert a specific .cdf file. (may be glob pattern)
  -adb, --adb <file>                        Animation database file to pull animations from
  -adba, --adb-actions [actions...]         Use only the listed actions (exact name)
```

Cry Geometry File (static, non animated files)
```
  -cgf, --cgf <file...>                     Convert a specific .cgf (or .skin) file. (may be glob pattern)
  -mtl, --mtl <file>                        Material file to use for all cgf files.
  -cgf-out, --cgf-out <outputFile>          Output file, all cgf will be merged to one model.
```

Dynamic slices
```
  -slice, --slice <file...>                 Converts models from .dynamicslice files. (may be glob pattern)
  -recursive, --recursive                   Recursively process referenced slice files. (potentially huge model output)
  -slice-out, --slice-out <outputFile>      Output file. Geometry from all processed slices is merged into one model.
```

Level directories. This is work in progress. This currently only works for the main menu level yet not for dungeons.
```
  -level, --level [ids...]                  Converts levels from levels directory.
```

Capital files. Point it to a dungeon folder to extract the dungeon level geometry.
This is work in progress and will later become part of `-level` option.
```
  -capital, --capital <file...>             Converts models from .capitals files. (may be glob pattern)
  -capital-out, --capital-out <outputFile>  Output file. All capital files are merged into one model.
```

To convert halloween costumes from datasheets. Requires `convert-datasheets` to be run.
```
  -costumes, --costumes [ids...]            Converts all costumes from costumes table. Models are placed in "costumechanges" directory. If list of ids is provided, only those costumes are converted.   
```

To convert npcs from datasheets. Requires `convert-datasheets` to be run.
```
  -npcs, --npcs [ids...]                    Converts all npcs from npcs table. Models are placed in "npcs" directory. If list of ids is provided, only those npcs are converted.
```

To convert mounts from datasheets. Requires `convert-datasheets` to be run.
```
  -mounts, --mounts [ids...]                Converts all mounts from mounts table. Models are placed in "mounts" directory. If list of ids is provided, only those mounts are converted.
```

To convert housing items from datasheets. Requires `convert-datasheets` AND `convert-slcies` to be run.
```
  -housing, --housing [ids...]              Converts all housing items from housing items tables. Models are placed in "housingitems" directory. If list of ids is provided, only those items are        
                                            converted.
```

To convert appearance items (transmog) from datasheets. Requires `convert-datasheets` to be run.
```
  -items, --items [ids...]                  Converts items appearances
  -items-m-chr, --items-m-chr-file <file>   Uses the skeleton from the given file for male items.
  -items-f-chr, --items-f-chr-file <file>   Uses the skeleton from the given file for female items.
  -weapons, --weapons [ids...]              Converts weapon appearances
  -instruments, --instruments [ids...]      Converts instruments appearances
```

To convert vitals. This is work in progress and requires a hand crafted json file for what to be converted.
```
  -file, --file [specFile]
```

## Example
Converts housing, instruments, weapons, mounts, costumes and gear items
```
pnpm convert-models --texture-size 1024 --glb `
--housing `
--instruments `
--weapons `
--mounts `
--costumes `
--items --items-m-chr-file objects/characters/player/male/player_male.chr --items-f-chr-file objects/characters/player/female/player_female.chr
```

Converts the male player model including the Idle and the Wave emote animations
```
pnpm convert-models --texture-size 1024 --glb `
--cdf objects/characters/player/male/player_male.cdf `
--cdf objects/characters/player/female/player_female.cdf `
--adb animations/mannequin/adb/player/player.adb `
--adb-actions Idle Emote_Wave 
```

# Preview Models

To preview the converted models, run

```
pnpm viewer
```

This will start a server and open the browser listing all converted models, allowing you to preview them.
