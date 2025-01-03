const t = require("ava");
const fs = require("fs-extra");
const path = require("path");

const PR_AUTHOR = process.env.PR_AUTHOR;
const MODIFIED_FILES = (process.env.MODIFIED_FILES || "").split(" ");
const EVENT = process.env.EVENT;
const RUN_ID = process.env.RUN_ID;

const domainsPath = path.resolve("domains");
const headDomainsPath = path.resolve(`register-${RUN_ID}/domains`);

const admins = require("../util/administrators.json");

async function getFileContent(basePath, fileName) {
    try {
        return await fs.readJson(path.join(basePath, fileName));
    } catch (err) {
        return null;
    }
}

t("Modified JSON files must be owned by the PR author", async (t) => {
    if (EVENT !== "pull_request") return t.pass();

    console.log("Modified files", MODIFIED_FILES);

    await Promise.all(
        MODIFIED_FILES.map(async (file) => {
            const fileName = file.substring(file.lastIndexOf("/") + 1);
            const modifiedDomain = await getFileContent(domainsPath, fileName);
            const currentDomain = (await getFileContent(headDomainsPath, fileName)) || modifiedDomain;

            if (!modifiedDomain || !currentDomain) {
                t.fail(`${file}: Unable to read domain data`);
                return;
            }

            t.true(
                currentDomain.owner.username === PR_AUTHOR || admins.includes(PR_AUTHOR),
                `${file}: Domain owner is ${currentDomain.owner.username} but ${PR_AUTHOR} is the PR author`
            );
        })
    );

    t.pass();
});

t("New JSON files must be owned by the PR author", async (t) => {
    if (EVENT !== "pull_request") return t.pass();

    const headDomainsFiles = fs.readdirSync(headDomainsPath);

    console.log("Head files", headDomainsFiles.filter((file) => MODIFIED_FILES.includes(`domains/${file}`)));

    console.log("Modified files", MODIFIED_FILES.map((file) => file.substring(file.lastIndexOf("/") + 1)));

    const newFiles = MODIFIED_FILES.map((file) => !headDomainsFiles.includes(file.substring(file.lastIndexOf("/") + 1)));

    console.log("New files", newFiles);

    await Promise.all(
        newFiles.map(async (file) => {
            const domain = await getFileContent(domainsPath, file.substring(file.lastIndexOf("/") + 1));

            if (!domain) {
                t.fail(`${file}: Unable to read domain data`);
                return;
            }

            t.true(
                domain.owner.username === PR_AUTHOR || admins.includes(PR_AUTHOR),
                `${file}: Domain owner is ${domain.owner.username} but ${PR_AUTHOR} is the PR author`
            );
        })
    );

    t.pass();
});
