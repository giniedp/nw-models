# New World Models

This tool extracts and converts New World game models into a web-ready format.

# Installation

You need to clone and build the project. It is not yet available on NPM.

Make sure your environment meets the following requirements:

- Node 18
- Yarn
- Enough disk space for the intermediate models and texture artifacts ~100GB (>250GB when not limiting texture size)

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

If you plan to extract housing items, run

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
  -i, --input [inputDir]             Path to the unpacked game directory (default: "out/data")
  -d, --tables [tablesDir]           Path to the tables directory (default: "out\\tables")
  -s, --slices [slicesDir]           Path to the slices directory (default: "out\\slices")
  -o, --output [outputDir]           Output Path to the output directory (default: "out\\models")
  -id, --id <appearanceId>           Filter by appearance id (may be part of ID)
  -hash, --hash <md5Hash>            Filter by md5 hash
  -skin, --skinFile <skinFileName>   Filter by skin file name (may be part of name)
  -u, --update                       Ignores and overrides previous export
  -t, --threads <threadCount>        Number of threads (default: "32")
  -ts, --texture-size <textureSize>  Makes all textures the same size. Should be a power of 2 value (512, 1024, 2048 etc) (default: "1024")
  --verbose                          Enables log output (automatically enabled if threads is 0)
  -h, --help                         display help for command
```

The `texture-size` parameter is currently needed because an internal library requires the textures to be the same size when they are blended with each other.
Pass a higher value here if you want to have higher resolution textures. You can also disable the texture
scaling by passing a `0`. This will keep the original texture size. However, some item models wont be tinted correctly.

## Output Folder Structure

The output (with default `.env` file) has the following structure

```
out/
├─ data/                           // data unpack dir for `yarn unpack`
├─ tables/                         // data tables dir for `yarn convert-tables`
├─ slices/                         // data unpack dir for `yarn convert-slices`
├─ models/
│  ├─ objects/                     // intermediate working directory
│  ├─ ...                          // bunch of other intermediate folders
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

# Preview Models

To preview the models, run

```
yarn viewer
```

This will start a server and open the browser listing all converted models, allowing you to preview them.

# Planned

- Extract Bones and Animations
- Extract Housing items
- Allow to extract specific models, that are not referenced in the datasheets (structures, expeditions?)
- Optimize textures (https://www.khronos.org/assets/uploads/apis/KTX-2.0-Launch-Overview-Apr21_.pdf)
- Overcome the texture size limitation
- Use https://gltf-transform.donmccurdy.com/ instead of Babylon.js scene to transform the model
