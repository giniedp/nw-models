import 'colors'
import { program } from 'commander'
import { CONVERT_DIR, GAME_DIR, MODELS_DIR, UNPACK_DIR } from '../env'

program
  .command('env')
  .description('Prints environment variables')
  .action(async () => {
    console.log({
      GAME_DIR,
      UNPACK_DIR,
      CONVERT_DIR,
      MODELS_DIR,
    })
  })
