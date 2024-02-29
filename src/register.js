import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commandsJSON } from "./commands";

// Discord.js endpoint
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Refreshing slash commands.`);
    const data = await rest.put(
      // PUT fully replaces with current set
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commandsJSON }
    );
    console.log(`Uploaded ${data.length} commands.`);
    process.exit(0); // Exits the process successfully
  } catch (error) {
    console.error(error);
    process.exit(1); // Exits with an error code indicating a failure
  }
})();
