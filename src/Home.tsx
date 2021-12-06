import {useEffect, useState} from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import {Button, CircularProgress, Container, makeStyles, Snackbar} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import {LAMPORTS_PER_SOL} from "@solana/web3.js";

import {useAnchorWallet} from "@solana/wallet-adapter-react";
import {WalletDialogButton} from "@solana/wallet-adapter-material-ui";
import {FaDiscord, FaTwitter} from 'react-icons/fa';


import {
    CandyMachine,
    awaitTransactionSignatureConfirmation,
    getCandyMachineState,
    mintOneToken,
    shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
    candyMachineId: anchor.web3.PublicKey;
    config: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    startDate: number;
    treasury: anchor.web3.PublicKey;
    txTimeout: number;
}

const useStyles = makeStyles(theme => ({
    root: {
        background: "rgba(0,0,0)",
        minHeight: '100vh',
        fontFamily: "'Montserrat', sans-serif",
    },
    header: {
        padding: '2rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heading: {
        textDecoration: "none",
        color: "rgba(55,202,55)",
        fontWeight: 700,
        fontSize: '1.25rem',
        fontFamily: "'Montserrat', sans-serif",
    },
    headerContainer: {
        borderBottom: '2px solid rgba(55,202,55)',
    },
    icons: {
        display: "flex",
        justifyContent: 'center',
        alignItems: "center",
    },
    mainSection: {
        textAlign: "center",
        padding: '4rem 0',

    },
    mainSectionContainer: {
        borderBottom: '2px solid rgba(55,202,55)',
    },
    icon: {
        margin: '0 1rem',
        cursor: "pointer",
        color: "#fff",
        textDecoration: "none",
        transition: "all .2s linear",
        '&:hover': {
            color: "rgba(55,202,55)"
        }
    },
    mainHeading: {
        fontWeight: 700,
        color: "rgba(55,202,55)",
        marginBottom: "1rem",
        fontSize: "1.875rem",
    },
    subHeading: {
        marginBottom: "1rem",
    },
    imageContainer: {
        marginTop: '1.5rem',
        marginBottom: '2rem',
    },
    image: {
        margin: "auto",
    },
    footerContainer: {
        borderBottom: '2px solid rgba(55,202,55)',
    },
    footer: {
        padding: "2rem 1rem",
    },
    footerContent: {
        display: 'flex',
        justifyContent: "space-between",
    },
    link: {
        color: "rgba(55,202,55)",
        fontWeight: 600,
        paddingTop: '.125rem',
        textDecoration: "none",
        fontSize: '1rem',
        cursor: "pointer",
        borderBottom: '2px solid transparent',
        transition: 'all .3s linear',

        '&:hover': {
            borderBottom: "2px solid rgba(55,202,55)",
        }
    },

    copyRightSection: {
        padding: "1rem",
        textAlign: "center",
    },
    rightIcons: {
        display: "flex",
        alignItems: "center",
    },
    rightIcon: {
        margin: '0 .5rem',
    },
    copyRightText: {
        fontSize: '.875rem',
        color: "rgba(55,202,55)",
    }
}))

const Home = (props: HomeProps) => {
    const [balance, setBalance] = useState<number>();
    const [isActive, setIsActive] = useState(false); // true when countdown completes
    const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

    const [itemsAvailable, setItemsAvailable] = useState(0);
    const [itemsRedeemed, setItemsRedeemed] = useState(0);
    const [itemsRemaining, setItemsRemaining] = useState(0);

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    const [startDate, setStartDate] = useState(new Date(props.startDate));

    const wallet = useAnchorWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachine>();

    const refreshCandyMachineState = () => {
        (async () => {
            if (!wallet) return;

            const {
                candyMachine,
                goLiveDate,
                itemsAvailable,
                itemsRemaining,
                itemsRedeemed,
            } = await getCandyMachineState(
                wallet as anchor.Wallet,
                props.candyMachineId,
                props.connection
            );

            setItemsAvailable(itemsAvailable);
            setItemsRemaining(itemsRemaining);
            setItemsRedeemed(itemsRedeemed);

            setIsSoldOut(itemsRemaining === 0);
            setStartDate(goLiveDate);
            setCandyMachine(candyMachine);
        })();
    };

    const onMint = async () => {
        try {
            setIsMinting(true);
            if (wallet && candyMachine?.program) {
                const mintTxId = await mintOneToken(
                    candyMachine,
                    props.config,
                    wallet.publicKey,
                    props.treasury
                );

                const status = await awaitTransactionSignatureConfirmation(
                    mintTxId,
                    props.txTimeout,
                    props.connection,
                    "singleGossip",
                    false
                );

                if (!status?.err) {
                    setAlertState({
                        open: true,
                        message: "Congratulations! Mint succeeded!",
                        severity: "success",
                    });
                } else {
                    setAlertState({
                        open: true,
                        message: "Mint failed! Please try again!",
                        severity: "error",
                    });
                }
            }
        } catch (error: any) {
            // TODO: blech:
            let message = error.msg || "Minting failed! Please try again!";
            if (!error.msg) {
                if (error.message.indexOf("0x138")) {
                } else if (error.message.indexOf("0x137")) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf("0x135")) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                    setIsSoldOut(true);
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            if (wallet) {
                const balance = await props.connection.getBalance(wallet.publicKey);
                setBalance(balance / LAMPORTS_PER_SOL);
            }
            setIsMinting(false);
            refreshCandyMachineState();
        }
    };

    useEffect(() => {
        (async () => {
            if (wallet) {
                const balance = await props.connection.getBalance(wallet.publicKey);
                setBalance(balance / LAMPORTS_PER_SOL);
            }
        })();
    }, [wallet, props.connection]);

    useEffect(refreshCandyMachineState, [
        wallet,
        props.candyMachineId,
        props.connection,
    ]);

    const styles = useStyles();

    return (
        <main className={styles.root}>

            {/*  Header  */}
            <div className={styles.headerContainer}>
                <Container maxWidth={'lg'} className={styles.header}>
                    {/*     Left Heading*/}
                    <div>
                        <a href="" className={styles.heading}>
                            PIT CREW
                        </a>
                    </div>

                    {/* Right icons*/}
                    <div className={styles.icons}>
                        <a target={"_blank"} href={'https://twitter.com/pitcrewnft'} rel={'noreferrer'}
                           className={styles.icon}>
                            <FaTwitter size={25}/>
                        </a>
                        <a target={"_blank"} href={'http://discord.gg/uzAt6SJvYu'} rel={'noreferrer'}
                           className={styles.icon}>
                            <FaDiscord size={25}/>
                        </a>
                    </div>

                </Container>
            </div>

            <div className={styles.mainSectionContainer}>
                <Container maxWidth={'lg'} className={styles.mainSection}>
                    <div className={styles.mainHeading}>
                        Mint Your Pits
                    </div>

                    <div className={styles.subHeading}>
                        Mint uniquely generated Pits for just 0.49 SOL each.
                    </div>

                    <div className={styles.subHeading}>
                        You can mint up to 5 Pits per transaction (no total limit).
                    </div>

                    <div className={styles.imageContainer}>
                        <img className={styles.image} src="https://w3.pitcrewnft.com/static/media/banner.49a428f0.gif"
                             alt=""/>
                    </div>

                    {/* Connect Wallet*/}
                    <div>
                        {wallet && (
                            <p>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
                        )}

                        {wallet && <p>Balance: {(balance || 0).toLocaleString()} SOL</p>}

                        {wallet && <p>Total Available: {itemsAvailable}</p>}

                        {wallet && <p>Redeemed: {itemsRedeemed}</p>}

                        {wallet && <p>Remaining: {itemsRemaining}</p>}

                        <MintContainer>
                            {!wallet ? (
                                <ConnectButton>Connect Wallet</ConnectButton>
                            ) : (
                                <MintButton
                                    disabled={isSoldOut || isMinting || !isActive}
                                    onClick={onMint}
                                    variant="contained"
                                >
                                    {isSoldOut ? (
                                        "SOLD OUT"
                                    ) : isActive ? (
                                        isMinting ? (
                                            <CircularProgress/>
                                        ) : (
                                            "MINT"
                                        )
                                    ) : (
                                        <Countdown
                                            date={startDate}
                                            onMount={({completed}) => completed && setIsActive(true)}
                                            onComplete={() => setIsActive(true)}
                                            renderer={renderCounter}
                                        />
                                    )}
                                </MintButton>
                            )}
                        </MintContainer>

                        <Snackbar
                            open={alertState.open}
                            autoHideDuration={6000}
                            onClose={() => setAlertState({...alertState, open: false})}
                        >
                            <Alert
                                onClose={() => setAlertState({...alertState, open: false})}
                                severity={alertState.severity}
                            >
                                {alertState.message}
                            </Alert>
                        </Snackbar>
                    </div>

                </Container>

            </div>

            {/* Footer container */}
            <div className={styles.footerContainer}>

                <Container className={styles.footer} maxWidth={'lg'}>
                    <div className={styles.footerContent}>

                        {/* Footer left content*/}
                        <div>

                            <a href={'mailto:support@pitcrewnft.com'} className={styles.link}>
                                support@pitcrewnft.com
                            </a>
                            <div>
                                <br/>
                                954 Ave Ponce De Leon, Suite 205 <br/>
                                San Juan, PR 00907
                            </div>

                        </div>

                        {/*    Footer Right Content*/}

                        <div>
                            <div className={styles.rightIcons}>
                                <a className={`${styles.rightIcon} ${styles.link}`}>
                                    Terms of Use
                                </a>
                                <a className={`${styles.rightIcon} ${styles.link}`}>
                                    Privacy Policy
                                </a>
                            </div>
                        </div>

                    </div>
                </Container>

            </div>

        {/*     copyright section    */}
            <div className={styles.copyRightSection}>
                <div className={styles.copyRightText}>
                    © 2021 Pit Crew | All Rights Reserved
                </div>
            </div>
        </main>
    );
};

interface AlertState {
    open: boolean;
    message: string;
    severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({days, hours, minutes, seconds, completed}: any) => {
    return (
        <CounterText>
            {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
        </CounterText>
    );
};

export default Home;
