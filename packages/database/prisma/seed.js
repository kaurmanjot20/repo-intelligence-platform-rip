"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const workspace = await prisma.workspace.upsert({
        where: { id: 'local-workspace' },
        update: {},
        create: { id: 'local-workspace', name: 'Local Workspace' },
    });
    await prisma.user.upsert({
        where: { id: 'local-user' },
        update: {},
        create: {
            id: 'local-user',
            workspaceId: workspace.id,
            email: 'local@rip.dev',
            name: 'Local User',
        },
    });
    console.log('Seed complete: local-workspace and local-user created');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map