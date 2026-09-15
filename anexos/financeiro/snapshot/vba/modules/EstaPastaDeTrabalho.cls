Attribute VB_Name = "EstaPastaDeTrabalho"
Attribute VB_Base = "0{00020819-0000-0000-C000-000000000046}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True
Option Explicit


Private Const PLANILHA_AUTOCOMPLETE As String = "ingredientes"


'==========================================================
' MUDANÇA DE SELEÇÃO
'==========================================================

Private Sub Workbook_SheetSelectionChange( _
    ByVal Sh As Object, _
    ByVal Target As Range)

    '======================================================
    ' SOMENTE PLANILHA "ingredientes"
    '======================================================

    If Not TypeOf Sh Is Worksheet Then
        Exit Sub
    End If


    If StrComp( _
        Sh.Name, _
        PLANILHA_AUTOCOMPLETE, _
        vbTextCompare) <> 0 Then

        'Se saiu da planilha ingredientes,
        'garante que nenhum controle fique visível.
        OcultarAutocomplete

        Set AutocompleteFicha = Nothing

        Exit Sub

    End If


    '======================================================
    ' IGNORA EVENTOS GERADOS PELA PRÓPRIA INICIALIZAÇÃO
    '======================================================

    If AutocompleteInicializando Then

        Debug.Print _
            "[SELECTION] Ignorado durante inicialização."

        Exit Sub

    End If


    '======================================================
    ' MESMA CÉLULA = MANTÉM A SESSÃO
    '======================================================

    If Not AutocompleteFicha Is Nothing Then

        If AutocompleteFicha.EstaNaMesmaCelula( _
            Sh, _
            Target) Then

            Debug.Print _
                "[SELECTION] Mesma célula. Sessão mantida."

            Exit Sub

        End If

    End If


    '======================================================
    ' NOVA CÉLULA
    '======================================================

    OcultarAutocomplete

    Set AutocompleteFicha = Nothing


    AtivarAutocomplete _
        Sh, _
        Target

End Sub


'==========================================================
' ABERTURA DA PASTA
'==========================================================

Private Sub Workbook_Open()

    On Error Resume Next

    AutocompleteInicializando = False

    OcultarAutocomplete

    Set AutocompleteFicha = Nothing

    On Error GoTo 0

End Sub


'==========================================================
' FECHAMENTO DA PASTA
'==========================================================

Private Sub Workbook_BeforeClose( _
    Cancel As Boolean)

    On Error Resume Next

    AutocompleteInicializando = False

    OcultarAutocomplete

    Set AutocompleteFicha = Nothing

    On Error GoTo 0

End Sub

