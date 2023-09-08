# New World Models

This tool extracts and converts New World game models into a web-ready format.

# Installation

You need to clone and build the project. It is not yet available on NPM.

Make sure your environment meets the following requirements:

- Node 18
- Yarn
- Enough disk space

Disk space requirements depend on which models how many you want to extract. Intermediate files, especially textures eat up a lot of space. Additionally textures are embedded in the final model file.

Clone the repo

```
git clone git@github.com:giniedp/nw-models.git
```

Build

```
yarn build
```

Take a look at the `.env.example` file. Make a copy to `.env` and adjust it to your needs.

If you have your own unpack workflow you can skip the `unpack` and `convert-tables` commands. Just make sure your `.env` is configured properly and the tables are in JSON format.

If you have not unpacked the game data yet, run

```
yarn unpack
```

This will unpack game data (models, textures, datasheets) into the unpack folder (see the `.env` file)

If you have not converted datatables to JSON yet, run

```
yarn convert-tables
```

If you plan to extract housing items, or creatures or models from `.dynamicslice` files, run

> HINT: this is WIP, housing items are not supported yet

```
yarn convert-slices
```

# Convert models

To extract and convert all item and weapon models just run

```
yarn convert
```

This command takes the following options

```
Options:
  -i, --input [inputDir]             Path to the unpacked game directory (default: "../nw-data/live")
  -d, --tables [tablesDir]           Path to the tables directory (default: "out\\tables")
  -s, --slices [slicesDir]           Path to the slices directory (default: "out\\slices")
  -x, --transit [transitDir]         Path to the intermediate directory (default: "out\\transit")
  -o, --output [outputDir]           Output Path to the output directory (default: "out\\models")
  -u, --update                       Ignores and overrides previous export
  -tc, --thread-count <threadCount>  Number of threads (default: "32")
  -id, --id <id>                     Filter by object identifier (may be substring, comma separated)
  -iid, --itemId <itemId>            Prefilter by ItemID (may be substring, comma separated)
  -hash, --hash <md5Hash>            Filter by md5 hash (must be exact, comma separated)
  -skin, --skin <skinFile>           Filter by skin file name (may be substring, comma separated)
  -at, --asset-type <assetType>      Filter by asset type. (must be exact, comma separated)
  --draco                            Enables Draco compression (default: false)
  --webp                             Converts textures to wepb instead of png before embedding into model (default: false)
  --ktx                              Compresses textures to ktx instead of png before embedding into model (default: false)
  --glb                              Exports binary GLTF .glb files instead of .gltf JSON (default: false)
  -ts, --texture-size <textureSize>  Resize all textures to given size. (default: "1024")
  --verbose                          Enables log output (automatically enabled if threads is 0)
  -slice, --slice <sliceFile>        Forcefully convert a single slice file
  -h, --help                         display help for command
```

The `texture-size` parameter is currently needed to make all textures uniform size, which helps in processing phase.

## Output Folder Structure

The output (with default `.env` file) has the following structure

```
out/
├─ data/                           // data unpack dir for `yarn unpack`
├─ tables/                         // data tables dir for `yarn convert-tables`
├─ slices/                         // data unpack dir for `yarn convert-slices`
├─ transit/                        // directory with intermediate files (textures, models, mats)
├─ models/
│  ├─ instrumentappearances/       // final models for instruments
│  ├─ itemappearances/             // final models for armors and weapons
│  ├─ weaponappearances/           // final models for weapons
│  ├─ weapons/                     // final models for weapons
│  ├─ stats.json                   // summary of all converted models
```

The output structure for models is as follows

```
[MODELS_DIR]/[DATASHEET]/[OBJECT_ID]-[PROPERTY].gltf
```

For example the file located at

```
out/models/itemappearances/m_voidbentheavy_chest-skin1.gltf
```

would be from

- data sheet: `javelindata_itemappearancedefinitions.json`
- object with `ItemId: m_voidbentheavy_chest`
- the model at property `Skin1`

# Convert models from slices

To extract a model from slice files, use the `--slice` parameter, e.g.

```
yarn convert --slice characters/**/*.dynamicslice.json
```

This will convert all slices under the `characters` directory, which contains all creatures

# Preview Models

To preview the models, run

```
yarn viewer
```

This will start a server and open the browser listing all converted models, allowing you to preview them.

# Planned

- Extract Bones and Animations
- Optimize textures (https://www.khronos.org/assets/uploads/apis/KTX-2.0-Launch-Overview-Apr21_.pdf)
- Overcome the texture size limitation
