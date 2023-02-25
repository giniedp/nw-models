# New World Models

This tool extracts and converts New World game models into a web-ready format.

# Installation

You need to clone and build the project. It is not yet available on NPM.

Make sure your environment meets the following requirements:

- Node 18
- Yarn

Clone the repo

```
git clone ...
```

Build

```
yarn build
```

Take a look at the `.env.example` file. Make a copy to `.env` and adjust it to your needs.

If you have not unpacked the game data yet, run

```
yarn unpack
```

This will unpack all the game data into the unpack folder (see the `.env` file) and convert the datatables to JSON format. This step can be skipped if you have already unpacked the game data. In this case, make sure that the json datatable files have the original base name.

# Convert models

To extract and convert all item and weapon models just run

```
yarn convert -p
```

and go for a lunch break, since it will take a while.

This command takes the following options

```
Options:
  -i, --input [inputDir]            Path to the unpacked game directory (default: "../nw-data")
  -o, --output [outputDir]          Path to the output directory (default: "out/models")
  -id, --id <itemId>                Filter by item id (may be part of ID)
  -skin, --skinFile <skinFileName>  Filter by skin file name (may be part of name)
  -u, --update                      Ignores and overrides previous export
  -t, --threads                     Number of threads
  --verbose                         Enables log output (automatically enabled if threads is 0)
  -h, --help                        display help for command
```

To convert a subset of models, you can filter by item ID. For example, this will export all voidbent armor items.

```
yarn convert -id VoidbentT5 -p
```

The output (with default `.env` file) has the following structure

```
out/
├─ models/
│  ├─ objects/                     // intermediate working directory
│  ├─ f_voidbentheavy_chest-female-armor.gltf
│  ├─ f_voidbentheavy_feet-female-armor.gltf
│  ├─ ...
│  ├─ stats.json                   // result stats and model to item mapping
```

To preview the models, run

```
yarn viewer
```

This will start a server and open the browser listing all converted models allowing to preview them

# Planned features

- Extract Bones and Animations
- Extract Housing items
- Allow to extract specific items, that are not in the database (structures?)

