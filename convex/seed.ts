import { mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { SUB_COUNTIES, OFFICIAL_POSITIONS } from "../src/lib/constants";

/**
 * Idempotent seed function to initialize:
 * - Busia County secondary schools
 * - Branch official structure with positions & portfolio descriptions
 * - Initial superadmin seed if none exists
 */
export const seedDatabase = mutation({
  args: {
    adminEmail: v.optional(v.string()),
    adminFullName: v.optional(v.string()),
  },
  handler: async (
    ctx: MutationCtx,
    args: { adminEmail?: string; adminFullName?: string }
  ) => {
    // 1. Seed Schools if table empty
    const existingSchools = await ctx.db.query("schools").first();
    let schoolsCount = 0;

    if (!existingSchools) {
      const initialSchools = [
        { name: "Busia Girls Secondary School", subCounty: "Matayos" as const },
        { name: "St. Mathias Boys High School", subCounty: "Matayos" as const },
        { name: "Our Lady of Mercy Girls High School", subCounty: "Matayos" as const },
        { name: "Nambale Boys High School", subCounty: "Nambale" as const },
        { name: "Kisoko Girls Secondary School", subCounty: "Nambale" as const },
        { name: "St. Thomas Aquinas High School", subCounty: "Nambale" as const },
        { name: "Kolanya Boys High School", subCounty: "Teso North" as const },
        { name: "Kolanya Girls National School", subCounty: "Teso North" as const },
        { name: "Moding Secondary School", subCounty: "Teso North" as const },
        { name: "St. Paul's Amukura High School", subCounty: "Teso South" as const },
        { name: "Chakol Girls Secondary School", subCounty: "Teso South" as const },
        { name: "Apatit Secondary School", subCounty: "Teso South" as const },
        { name: "Butula Boys High School", subCounty: "Butula" as const },
        { name: "Kingandole Secondary School", subCounty: "Butula" as const },
        { name: "Bumutiru Secondary School", subCounty: "Butula" as const },
        { name: "Sigalame High School", subCounty: "Samia (Funyula)" as const },
        { name: "Funyula Girls Secondary School", subCounty: "Samia (Funyula)" as const },
        { name: "Nangina Girls High School", subCounty: "Samia (Funyula)" as const },
        { name: "John Osogo Secondary School", subCounty: "Bunyala (Budalangi)" as const },
        { name: "Bunyala Model Secondary School", subCounty: "Bunyala (Budalangi)" as const },
        { name: "St. Anne's Bunyala Girls", subCounty: "Bunyala (Budalangi)" as const },
      ];

      for (const school of initialSchools) {
        await ctx.db.insert("schools", {
          name: school.name,
          subCounty: school.subCounty,
          isActive: true,
        });
        schoolsCount++;
      }
    }

    // 2. Seed Initial Official Roster if table empty
    const existingOfficials = await ctx.db.query("officials").first();
    let officialsCount = 0;

    if (!existingOfficials) {
      const defaultOfficials = [
        {
          fullName: "Moffats Okisai",
          position: "Executive Secretary",
          responsibilities:
            "Chief executive officer and spokesperson of the branch. Oversees daily union operations, labor dispute negotiations with TSC, legal defense, and overall welfare coordination for all post-primary teachers across Busia County.",
          portfolioArea: "County Executive",
          phone: "+254722000001",
          email: "execsec@kuppetbusia.ke",
          displayOrder: 1,
          tier: "executive" as const,
          canHandleHarassment: true,
          isActive: true,
        },
        {
          fullName: "Rosemary Wandera",
          position: "Chairperson",
          responsibilities:
            "Presides over branch general meetings, Executive Committee deliberations, and represents the branch in national governing council assemblies. Responsible for union governance, policy integrity, and institutional oversight.",
          portfolioArea: "County Governance",
          phone: "+254722000002",
          email: "chair@kuppetbusia.ke",
          displayOrder: 2,
          tier: "executive" as const,
          canHandleHarassment: true,
          isActive: true,
        },
        {
          fullName: "David Barasa",
          position: "Vice Chairperson",
          responsibilities:
            "Deputises the Branch Chairperson in all legislative, procedural, and governance functions. Chairs internal welfare adjudication sessions and member grievance preliminary panels.",
          portfolioArea: "Branch Governance & Welfare",
          phone: "+254722000003",
          email: "vicechair@kuppetbusia.ke",
          displayOrder: 3,
          tier: "executive" as const,
          canHandleHarassment: false,
          isActive: true,
        },
        {
          fullName: "Patricia Achieng",
          position: "Assistant Executive Secretary",
          responsibilities:
            "Assists the Executive Secretary in grievance documentation, teacher service transfers, administrative correspondence, and member records custody.",
          portfolioArea: "Administration & Grievances",
          phone: "+254722000004",
          email: "asstexec@kuppetbusia.ke",
          displayOrder: 4,
          tier: "executive" as const,
          canHandleHarassment: true,
          isActive: true,
        },
        {
          fullName: "Emmanuel Ouma",
          position: "Treasurer",
          responsibilities:
            "Custodian of branch finances, accounts, and asset administration. Oversees disbursement of approved bereavement funds, bus maintenance audits, and annual financial statements for AGM submission.",
          portfolioArea: "Treasury & Finance",
          phone: "+254722000005",
          email: "treasurer@kuppetbusia.ke",
          displayOrder: 5,
          tier: "executive" as const,
          canHandleHarassment: false,
          isActive: true,
        },
        {
          fullName: "Grace Nekesa",
          position: "Organising Secretary",
          responsibilities:
            "Directs union mobilization, branch workshops, educational symposiums, sports leagues, and logistics for union bus operations across all 7 sub-counties.",
          portfolioArea: "Mobilization & Events",
          phone: "+254722000006",
          email: "organising@kuppetbusia.ke",
          displayOrder: 6,
          tier: "executive" as const,
          canHandleHarassment: false,
          isActive: true,
        },
        {
          fullName: "Lilian Were",
          position: "Gender/Women Representative",
          responsibilities:
            "Leads gender equity policies, women educators empowerment initiatives, and serves as primary counselor and designated liaison for gender-based harassment and maternal welfare support.",
          portfolioArea: "Gender Affairs & Harassment Liaison",
          phone: "+254722000007",
          email: "gender@kuppetbusia.ke",
          displayOrder: 7,
          tier: "official" as const,
          canHandleHarassment: true,
          isActive: true,
        },
        {
          fullName: "Kevin Mukudi",
          position: "Youth Representative",
          responsibilities:
            "Advocates for newly posted junior secondary and secondary school tutors, intern teacher confirmation advocacy, and digital skill continuous professional development programs.",
          portfolioArea: "Young & Intern Teachers",
          phone: "+254722000008",
          email: "youth@kuppetbusia.ke",
          displayOrder: 8,
          tier: "official" as const,
          canHandleHarassment: false,
          isActive: true,
        },
      ];

      const now = Date.now();
      for (const off of defaultOfficials) {
        await ctx.db.insert("officials", {
          ...off,
          createdAt: now,
          updatedAt: now,
        });
        officialsCount++;
      }
    }

    // 3. Superadmin registration fallback if email supplied and no superadmin exists
    let superadminCreated = false;
    if (args.adminEmail) {
      const existingSuperadmin = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "superadmin"))
        .first();

      if (!existingSuperadmin) {
        const now = Date.now();
        await ctx.db.insert("users", {
          fullName: args.adminFullName || "Branch IT Administrator",
          email: args.adminEmail.toLowerCase(),
          idNumber: "11223344",
          tscNumber: "ADM001",
          phone: "+254700000000",
          school: "KUPPET Busia Branch Secretariat",
          subCounty: "Matayos",
          designation: "Other",
          role: "superadmin",
          status: "active",
          failedLoginCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        superadminCreated = true;
      }
    }

    return {
      message: "Database seed completed successfully.",
      schoolsSeeded: schoolsCount,
      officialsSeeded: officialsCount,
      superadminCreated,
    };
  },
});
