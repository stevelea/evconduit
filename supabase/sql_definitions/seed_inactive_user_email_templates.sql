-- supabase/sql_definitions/seed_inactive_user_email_templates.sql
-- Email templates for inactive user cleanup notifications

-- 14-day warning emails (English and Swedish)
INSERT INTO public.email_templates (template_name, subject, html_body, text_body, language_code, is_one_off)
VALUES
    (
        'inactive_warning_14d',
        'Your EVConduit account needs attention',
        '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Hi {{name}},</h2>

<p>We noticed you created an EVConduit account but haven''t linked a vehicle yet.</p>

<p>To keep your account active, please link your electric vehicle within the next <strong>16 days</strong>. If no vehicle is linked, your account will be scheduled for deletion after 30 days of inactivity.</p>

<p style="text-align: center; margin: 24px 0;">
  <a href="https://evconduit.com/dashboard"
     style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Link Your Vehicle Now
  </a>
</p>

<p>Need help? Reply to this email or visit our <a href="https://evconduit.com/docs">documentation</a>.</p>

<p>Best regards,<br/>
The EVConduit Team</p>

<hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />
<p style="font-size: 12px; color: #666;">
This email was sent because you registered for an EVConduit account. If you no longer wish to use EVConduit, you can ignore this email and your account will be removed automatically.
</p>
</body>
</html>',
        'Hi {{name}},

We noticed you created an EVConduit account but haven''t linked a vehicle yet.

To keep your account active, please link your electric vehicle within the next 16 days. If no vehicle is linked, your account will be scheduled for deletion after 30 days of inactivity.

Link your vehicle at: https://evconduit.com/dashboard

Need help? Reply to this email or visit our documentation at https://evconduit.com/docs

Best regards,
The EVConduit Team',
        'en',
        TRUE
    ),
    (
        'inactive_warning_14d',
        'Ditt EVConduit-konto behover uppmärksamhet',
        '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Hej {{name}},</h2>

<p>Vi märkte att du skapade ett EVConduit-konto men ännu inte har länkat ett fordon.</p>

<p>För att behålla ditt konto aktivt, vänligen länka ditt elfordon inom de närmaste <strong>16 dagarna</strong>. Om inget fordon länkas kommer ditt konto att schemaläggas för radering efter 30 dagars inaktivitet.</p>

<p style="text-align: center; margin: 24px 0;">
  <a href="https://evconduit.com/dashboard"
     style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Länka ditt fordon nu
  </a>
</p>

<p>Behöver du hjälp? Svara på detta mejl eller besök vår <a href="https://evconduit.com/docs">dokumentation</a>.</p>

<p>Med vänliga hälsningar,<br/>
EVConduit-teamet</p>

<hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />
<p style="font-size: 12px; color: #666;">
Detta mejl skickades eftersom du registrerade ett EVConduit-konto. Om du inte längre vill använda EVConduit kan du ignorera detta mejl och ditt konto kommer att tas bort automatiskt.
</p>
</body>
</html>',
        'Hej {{name}},

Vi märkte att du skapade ett EVConduit-konto men ännu inte har länkat ett fordon.

För att behålla ditt konto aktivt, vänligen länka ditt elfordon inom de närmaste 16 dagarna. Om inget fordon länkas kommer ditt konto att schemaläggas för radering efter 30 dagars inaktivitet.

Länka ditt fordon på: https://evconduit.com/dashboard

Behöver du hjälp? Svara på detta mejl eller besök vår dokumentation på https://evconduit.com/docs

Med vänliga hälsningar,
EVConduit-teamet',
        'sv',
        TRUE
    ),
    -- 28-day reminder emails (English and Swedish)
    (
        'inactive_reminder_28d',
        'Final reminder: Your EVConduit account will be deleted soon',
        '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Hi {{name}},</h2>

<p><strong>This is your final reminder.</strong></p>

<p>Your EVConduit account will be flagged for deletion in <strong>2 days</strong> because no vehicle has been linked.</p>

<p>If you still want to use EVConduit, please link your electric vehicle now:</p>

<p style="text-align: center; margin: 24px 0;">
  <a href="https://evconduit.com/dashboard"
     style="background-color: #DC2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Link Your Vehicle Now
  </a>
</p>

<p>After your account is flagged, an administrator will review it before permanent deletion.</p>

<p>If you have any questions or need assistance, please reply to this email.</p>

<p>Best regards,<br/>
The EVConduit Team</p>

<hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />
<p style="font-size: 12px; color: #666;">
This is an automated message. Your account was created on {{created_at}} and no vehicle has been linked since then.
</p>
</body>
</html>',
        'Hi {{name}},

FINAL REMINDER

Your EVConduit account will be flagged for deletion in 2 days because no vehicle has been linked.

If you still want to use EVConduit, please link your electric vehicle now at:
https://evconduit.com/dashboard

After your account is flagged, an administrator will review it before permanent deletion.

If you have any questions or need assistance, please reply to this email.

Best regards,
The EVConduit Team',
        'en',
        TRUE
    ),
    (
        'inactive_reminder_28d',
        'Sista påminnelsen: Ditt EVConduit-konto kommer snart att raderas',
        '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Hej {{name}},</h2>

<p><strong>Detta är din sista påminnelse.</strong></p>

<p>Ditt EVConduit-konto kommer att flaggas för radering om <strong>2 dagar</strong> eftersom inget fordon har länkats.</p>

<p>Om du fortfarande vill använda EVConduit, vänligen länka ditt elfordon nu:</p>

<p style="text-align: center; margin: 24px 0;">
  <a href="https://evconduit.com/dashboard"
     style="background-color: #DC2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
    Länka ditt fordon nu
  </a>
</p>

<p>Efter att ditt konto har flaggats kommer en administratör att granska det innan permanent radering.</p>

<p>Om du har några frågor eller behöver hjälp, vänligen svara på detta mejl.</p>

<p>Med vänliga hälsningar,<br/>
EVConduit-teamet</p>

<hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />
<p style="font-size: 12px; color: #666;">
Detta är ett automatiskt meddelande. Ditt konto skapades den {{created_at}} och inget fordon har länkats sedan dess.
</p>
</body>
</html>',
        'Hej {{name}},

SISTA PÅMINNELSEN

Ditt EVConduit-konto kommer att flaggas för radering om 2 dagar eftersom inget fordon har länkats.

Om du fortfarande vill använda EVConduit, vänligen länka ditt elfordon nu på:
https://evconduit.com/dashboard

Efter att ditt konto har flaggats kommer en administratör att granska det innan permanent radering.

Om du har några frågor eller behöver hjälp, vänligen svara på detta mejl.

Med vänliga hälsningar,
EVConduit-teamet',
        'sv',
        TRUE
    )
ON CONFLICT (template_name, language_code) DO UPDATE SET
    subject = EXCLUDED.subject,
    html_body = EXCLUDED.html_body,
    text_body = EXCLUDED.text_body,
    is_one_off = EXCLUDED.is_one_off,
    updated_at = now();
